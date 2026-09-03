---
name: nestjs
trigger: model_decision
description: NestJS 模块、Controller、Service、依赖注入、校验、异常处理规范
---

# NestJS 开发规范

## 1. 文件与目录结构

按业务能力聚合，禁止按技术层全局散放：
- 模块目录：`src/users/`、`src/orders/`
- Module：`users.module.ts`
- Controller：`users.controller.ts`
- Service：`users.service.ts`
- DTO：`dto/create-user.dto.ts`
- Entity/Model：`entities/user.entity.ts` 或 `models/user.model.ts`（按项目 ORM 统一）
- 常量：模块内 `constants/` 或共享 `common/constants/`
- Guard/Pipe/Interceptor：业务专用放模块内，通用放 `common/`

---

## 2. Module

- 只声明依赖关系（`imports`/`controllers`/`providers`/`exports`），禁止写业务逻辑
- 只导出外部需要的 Provider，避免隐式耦合
- 跨模块调用通过导出的 Service，禁止直接导入内部类
- 全局模块（`@Global()`）仅用于配置、日志等基础能力

```typescript
@Module({
  imports: [ConfigModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## 3. Controller

- 只处理协议层：参数提取、DTO、状态码、调用 Service
- 禁止写业务逻辑（数据库操作、业务判断下沉到 Service）
- 路由使用资源名复数：`users`、`orders`
- 请求体必须用 DTO，禁止 `@Body() body: any`
- 非默认状态码用 `@HttpCode()` 显式声明
- 参数类型通过 Pipe 转换与校验

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createUserDto);
  }
}
```

---

## 4. Service

- 承载业务逻辑：业务规则、状态变更、事务边界、外部依赖调用
- 构造函数注入依赖，禁止手动 `new`
- 对外方法显式声明返回类型 `Promise<T>` 或具体类型
- 方法职责单一，复杂流程拆成私有方法
- 私有方法保持业务语义，禁止拆成无意义碎片

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.create(createUserDto);
    return UserResponseDto.fromEntity(user);
  }
}
```

---

## 5. DTO 与校验

- 请求 DTO 必须用 class，配合 `class-validator` 和 `ValidationPipe`
- 每个外部输入字段声明校验装饰器
- DTO 只表达结构和基础校验，禁止写业务逻辑
- 更新 DTO 用 `PartialType`/`PickType`/`OmitType` 复用
- 响应 DTO 与实体隔离，禁止直接返回数据库实体

```typescript
export class CreateUserDto {
  @IsString()
  @Length(2, 32)
  readonly name: string = '';

  @IsEmail()
  readonly email: string = '';
}
```

---

## 6. Provider 与依赖注入

- Provider 必须由 Nest 容器管理（`@Injectable()` 或显式配置）
- 依赖通过构造函数注入，禁止方法内临时创建实例
- 字符串 Token 用 `UPPER_SNAKE_CASE` 常量集中定义
- 外部 SDK 封装为 Provider，禁止业务代码散落初始化
- 循环依赖优先重构模块边界，`forwardRef()` 作为最后手段

```typescript
export const PAYMENT_CLIENT = 'PAYMENT_CLIENT';

@Module({
  providers: [
    {
      provide: PAYMENT_CLIENT,
      useFactory: (configService: ConfigService) => createPaymentClient(configService),
      inject: [ConfigService],
    },
  ],
})
export class PaymentsModule {}
```

---

## 7. Guard / Pipe / Interceptor / Decorator

| 类型 | 用途 | 禁止 |
|------|------|------|
| Guard | 鉴权、权限、访问控制 | 业务数据变更 |
| Pipe | 参数转换、输入校验 | 访问数据库做业务判断 |
| Interceptor | 响应包装、耗时统计、序列化 | 吞掉异常或改变业务语义 |
| Decorator | 提取请求上下文、声明元数据 | 隐藏复杂业务逻辑 |

```typescript
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserPayload => {
    const request = context.switchToHttp().getRequest<Request>();
    return request.user as CurrentUserPayload;
  },
);
```

---

## 8. 异常处理

- 使用 NestJS 标准异常：`BadRequestException`、`UnauthorizedException`、`NotFoundException`
- 业务失败通过 `throw` 表达，禁止返回 `{ code, message }` 伪错误对象
- 异常信息面向调用方，不暴露数据库结构、堆栈、密钥
- 全局异常格式用 Exception Filter 统一处理
- 只为重新抛出的 `try/catch` 必须删除

```typescript
if (!user) {
  throw new NotFoundException('用户不存在');
}
```

---

## 9. 配置

- 统一通过 `ConfigService` 或配置模块读取
- 禁止业务代码散落 `process.env`，只允许配置模块读取环境变量
- 启动时校验必填配置，缺失时应用启动失败
- 配置值转换为明确类型（端口、超时、开关）
- `.env`、证书、Token 不进入仓库

```typescript
@Injectable()
export class ApiClientConfig {
  constructor(private readonly configService: ConfigService) {}

  get timeoutMs(): number {
    return this.configService.getOrThrow<number>('API_TIMEOUT_MS');
  }
}
```

---

## 10. 日志

- 使用 NestJS Logger 或项目日志封装，禁止 `console.log`
- 记录业务 ID、请求 ID、关键状态，不记录敏感信息
- 错误日志保留异常对象（堆栈和错误类型）
- 高频路径（列表查询、轮询、健康检查）控制日志量

```typescript
private readonly logger = new Logger(UsersService.name);
```

---

## 11. 测试

| 类型 | 测试重点 |
|------|---------|
| Controller | 路由参数、DTO 绑定、状态码、Service 调用 |
| Service | 业务分支、异常分支、依赖调用、事务边界 |
| Guard | 允许/拒绝路径、元数据读取、异常类型 |
| Pipe | 转换结果、校验失败、边界输入 |
| Interceptor | 响应转换、异常透传、副作用可控性 |

```typescript
describe('UsersService', () => {
  it('用户不存在时应抛出 NotFoundException', async () => {
    await expect(service.findById('missing-id')).rejects.toThrow(NotFoundException);
  });
});
```

---

## 常犯错误

1. Controller 中直接写数据库查询或业务判断 → 下沉到 Service
2. `@Body() body: any` 接收请求体 → 定义 DTO 并添加校验装饰器
3. 业务代码直接读 `process.env` → 通过 `ConfigService` 获取
4. 手动 `new Service()` 或 `new Repository()` → 交给依赖注入容器
5. 直接返回 Entity 作为接口响应 → 使用 Response DTO
6. 捕获异常后返回成功响应包错误码 → 抛出标准异常，统一处理
