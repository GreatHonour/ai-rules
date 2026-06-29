---
name: nestjs
trigger: model_decision
description: 当你要编写 NestJS 模块、Controller、Service、DTO、Provider、Guard、Pipe、Interceptor、异常处理、配置或测试时，来这里查 NestJS 通用开发规范。
---

# NestJS 开发规范

> **加载时机**：编写或修改 NestJS 后端代码、接口、依赖注入、请求校验、异常处理、配置读取、日志或测试时。

---

## 1. 文件与目录结构

| 场景 | 规则 | 示例 |
| ---- | ---- | ---- |
| 模块目录 | 按业务能力聚合，禁止按技术层散放到全局目录 | `src/users/`、`src/orders/` |
| Module | 文件名使用 `*.module.ts` | `users.module.ts` |
| Controller | 文件名使用 `*.controller.ts` | `users.controller.ts` |
| Service | 文件名使用 `*.service.ts` | `users.service.ts` |
| DTO | 放在业务模块 `dto/` 目录 | `dto/create-user.dto.ts` |
| Entity / Model | 放在业务模块 `entities/` 或 `models/` 目录，按项目实际 ORM 约定统一 | `entities/user.entity.ts` |
| 常量 | 放在业务模块 `constants/` 或共享 `common/constants/` | `auth.constants.ts` |
| 自定义装饰器 | 放在 `decorators/` | `current-user.decorator.ts` |
| Guard / Pipe / Interceptor | 业务专用放模块内，通用能力放 `common/` | `common/guards/auth.guard.ts` |

**禁止**：把所有 Controller、Service、DTO 堆到顶层 `controllers/`、`services/`、`dto/` 目录，导致模块边界失效。

---

## 2. Module 组织

| 规则 | 说明 |
| ---- | ---- |
| Module 只声明依赖关系 | `imports`、`controllers`、`providers`、`exports` 保持清晰，禁止写业务逻辑 |
| 只导出外部真正需要的 Provider | 默认不导出内部 Service，避免模块之间形成隐式耦合 |
| 跨模块调用通过导出的 Service | 禁止从其他模块路径直接导入内部实现类 |
| 全局模块谨慎使用 | 只有配置、日志、基础设施能力可考虑 `@Global()` |

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

## 3. Controller 规则

| 规则 | 说明 |
| ---- | ---- |
| Controller 只处理协议层 | 参数提取、DTO、状态码、调用 Service |
| 禁止写业务逻辑 | 业务判断、数据库操作、复杂计算必须下沉到 Service |
| 路由必须语义化 | 使用资源名复数：`users`、`orders` |
| 请求体必须使用 DTO | 禁止 `@Body() body: any` 或裸对象 |
| 显式声明状态码 | 非默认状态码使用 `@HttpCode()` |
| 参数类型显式转换 | 数字、布尔、数组等参数通过 Pipe 转换与校验 |

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

## 4. Service 规则

| 规则 | 说明 |
| ---- | ---- |
| Service 承载业务逻辑 | 聚合业务规则、状态变更、事务边界和外部依赖调用 |
| 构造函数注入依赖 | 禁止手动 `new` Provider |
| 导出方法标注返回类型 | 对外方法必须显式声明 `Promise<T>` 或具体返回类型 |
| 方法职责单一 | 一个方法只完成一个业务动作，复杂流程拆成私有方法 |
| 私有方法不绕过业务语义 | 私有方法用于局部复用，禁止把主流程拆成无语义碎片 |

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

| 规则 | 说明 |
| ---- | ---- |
| 请求 DTO 必须使用 class | 配合 `class-validator`、`class-transformer` 和 `ValidationPipe` |
| DTO 字段必须声明校验装饰器 | 每个外部输入字段都要有明确约束 |
| 禁止在 DTO 写业务逻辑 | DTO 只表达输入/输出结构和基础校验 |
| 更新 DTO 复用创建 DTO | 可使用 `PartialType`、`PickType`、`OmitType` |
| 响应 DTO 与实体隔离 | 禁止直接把数据库实体作为接口响应契约 |

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

| 规则 | 说明 |
| ---- | ---- |
| Provider 必须由 Nest 容器管理 | 使用 `@Injectable()` 或显式 provider 配置 |
| 依赖通过构造函数注入 | 禁止在方法内部临时创建依赖实例 |
| Token 常量集中定义 | 字符串 Token 使用 `UPPER_SNAKE_CASE` 常量 |
| 外部 SDK 封装为 Provider | 禁止业务代码直接散落初始化 SDK |
| 循环依赖优先重构模块边界 | `forwardRef()` 只能作为最后手段 |

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

| 类型 | 使用场景 | 禁止事项 |
| ---- | -------- | -------- |
| Guard | 鉴权、权限、访问控制 | 禁止写业务数据变更 |
| Pipe | 参数转换、输入校验 | 禁止访问数据库完成业务判断 |
| Interceptor | 响应包装、耗时统计、序列化 | 禁止吞掉异常或改变业务语义 |
| Decorator | 提取请求上下文或声明元数据 | 禁止隐藏复杂业务逻辑 |

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

| 规则 | 说明 |
| ---- | ---- |
| 使用 NestJS 标准异常 | `BadRequestException`、`UnauthorizedException`、`NotFoundException` 等 |
| 业务失败通过 `throw` 表达 | 禁止返回 `{ code, message }` 伪错误对象 |
| 异常信息面向调用方 | 不暴露数据库结构、堆栈、密钥或内部实现 |
| 全局异常格式统一处理 | 使用 Exception Filter 或框架统一响应层 |
| 捕获异常必须有处理意义 | 只为重新抛出同一个异常的 `try/catch` 必须删除 |

```typescript
if (!user) {
  throw new NotFoundException('用户不存在');
}
```

---

## 9. 配置与环境变量

| 规则 | 说明 |
| ---- | ---- |
| 统一通过配置模块读取 | 使用 `ConfigService` 或项目配置封装 |
| 禁止业务代码散落 `process.env` | 只允许配置模块集中读取环境变量 |
| 启动时校验配置 | 必填环境变量必须在应用启动阶段失败 |
| 配置值转换类型 | 端口、超时、开关等必须转换为明确类型 |
| 禁止提交密钥 | `.env`、证书、Token 不进入仓库 |

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

| 规则 | 说明 |
| ---- | ---- |
| 使用 NestJS Logger 或项目日志封装 | 禁止在业务代码中使用 `console.log` |
| 日志包含业务上下文 | 记录业务 ID、请求 ID、关键状态，不记录敏感信息 |
| 错误日志保留异常对象 | 便于追踪堆栈和错误类型 |
| 高频路径控制日志量 | 列表查询、轮询、健康检查避免噪声日志 |

```typescript
private readonly logger = new Logger(UsersService.name);
```

---

## 11. 测试

| 类型 | 测试重点 |
| ---- | -------- |
| Controller | 路由参数、DTO 绑定、状态码、调用 Service |
| Service | 业务分支、异常分支、依赖调用、事务边界 |
| Guard | 允许/拒绝路径、元数据读取、异常类型 |
| Pipe | 转换结果、校验失败、边界输入 |
| Interceptor | 响应转换、异常透传、副作用是否可控 |

```typescript
describe('UsersService', () => {
  it('用户不存在时应抛出 NotFoundException', async () => {
    await expect(service.findById('missing-id')).rejects.toThrow(NotFoundException);
  });
});
```

---

## 常犯错误

| # | 错误 | 修正 |
|---|------|------|
| 1 | Controller 中直接写数据库查询或业务判断 | 下沉到 Service |
| 2 | `@Body() body: any` 接收请求体 | 定义 DTO 并添加校验装饰器 |
| 3 | 业务代码直接读取 `process.env` | 通过配置模块或 `ConfigService` 获取 |
| 4 | 手动 `new Service()` 或 `new Repository()` | 交给 Nest 依赖注入容器 |
| 5 | 直接返回 Entity 作为接口响应 | 使用 Response DTO 或序列化层 |
| 6 | 捕获异常后返回成功响应包错误码 | 抛出标准异常，由异常层统一处理 |
