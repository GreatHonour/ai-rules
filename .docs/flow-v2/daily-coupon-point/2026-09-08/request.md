# 每日优惠券数据埋点需求

## 交付目标

在每日优惠券流程中增加埋点，仅覆盖开发和测试环境，并验证请求发出的参数及成功响应参数。

## 上报接口

- 接口：`/api/app/play/point/push`
- 已确认参数：`userid`、`event`
- 需要补充：时间字段、活动 ID 字段

## 事件清单

| 事件编码 | 事件含义 |
| --- | --- |
| `DailyCouponEnterAuthPage` | 打开页面 |
| `DailyCouponClickAuthorize` | 点击去授权 |
| `DailyCouponEnterPage` | 进入兜底页 |
| `DailyCouponEnterActivityPage` | 进入自定义页 |
| `DailyCouponHotAreaClick` | 热区点击 |
| `DailyCouponPopupShow` | 领券弹窗展示 |
| `DailyCouponPopupViewCoupon` | 领券弹窗点击查看优惠券 |
| `DailyCouponPopupInviteFriend` | 领券弹窗点击邀好友一起领 |
| `DailyCouponPopupClose` | 领券弹窗点击关闭 |

## 环境与验收

- 环境：开发、测试
- 请求验证：检查发出的 `userid`、`event`、时间和活动 ID 参数
- 成功验证：检查成功响应中的参数

## 待确认契约

- 时间字段的准确名称、单位和时区
- 活动 ID 字段的准确名称与类型
- 成功响应中需要断言的具体字段
