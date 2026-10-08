# 真实后端响应

`multi-task-flow.json` 不是手写的。它由 rice 的集成测试
`test/rice_web/api/task_flow_test.exs` 走完整个多人任务流程后导出,
每一步记录五个身份(管理员、三位承接者、路人)和未登录各自拿到的 `GET /api/tasks/:id`。
id 已换成固定标签,时间戳保留。

重新生成(在 rice 目录):

    TASK_FLOW_FIXTURE_DIR=../rice-front/src/features/tasks/__fixtures__ \
      mix test test/rice_web/api/task_flow_test.exs

前端的 `TaskDetailPage.flow.test.tsx` 只用这里的数据渲染,不再手工拼任务对象,
免得把后端不可能产生的状态组合"造"出来。
