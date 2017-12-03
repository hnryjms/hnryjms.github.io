---
layout: post
title:  "Avoiding the Microservice Pendulum"
summary: "Article Summary"
---
At [HouseRater][houserater], we're proud to have built a scalable microservice web application as a service for our
internal customer, and grow to companies across the country. But the pendulum of microservice architecture has swung
between monolith and microservice several times now.

We know the benefits of **microservice** cloud applications—different parts of the system can scale up when needed
without the whole product needing more resources. It also means each component actually needs less resources to
perform it's smaller list of jobs. We also know the benefits of **monolith** applications, where every component has
instant access to other aspects of the system to support complex interactions. As applications grow, components gain
complexity and functionality that can overwrite your backend approach, bringing you closer to the side you tried hard
to avoid.

Here are a few tenants my organization has learned when building a microservice app.

### Mindless Task Distribution

As actions occur throughout a microservice system, components need to trigger actions across a spread of services, and
something needs to decide how to hook these pieces together. **The answer it not your app**. Each component should
know how to share a job, but care very little about what server performs it. Learning a 'Service Discovery' system like
[Consul][consul] or [EC2 Load Balancers][ec2elb] so components can call functions wherever they live, is incredibly
important.

This is especially important when it comes to client-side interactions. **Do not make clients care** about your
microservices. Although a single-repository for all components is preferable, it can make it easy for developers to
track which servers can run the right actions.

### Simple Scheduling & Running

Components also need a clear way to call other microservices that flows cleanly with internal operations. Without
a concise way to distribute tasks, one service could become `hr-main-web` for processing all requests.

### Putting it all together

Imagine a `Node.js` program that can distribute tasks like this example:

```js
const { Schedule, Run } = require('lib/microservice/services');
const Tasks = require('lib/microservice/tasks');

Schedule(Tasks.UPLOAD_IMAGE, async ({ body, name }) => {
    // Remove the old file and upload a new one
    await Run(Tasks.REMOVE_IMAGE, { name });
    await UploadFile(name, body);
    
    // Perform resizing in the background
    Run(Tasks.RESIZE_IMAGE, { fileKey });
});
```

While a framework like that does not exist, you can visualize the `Schedule()` and `Run()` hooks making it incredibly
easy for tasks to request actions from other components both asynchronously or not.

[houserater]: https://www.houserater.com/
[consul]: https://www.consul.io/
[ec2elb]: https://aws.amazon.com/elasticloadbalancing/
