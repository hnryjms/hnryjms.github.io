---
layout: post
title:  "Running Selenium Test Suite in AWS CodeBuild"
summary: "Modern web applications should include at least a few tests. Thanks to docker-selenium and @dtinth we're able
to launch a pre-configured Google Chrome and record the test run to an MP4 video in AWS CodeBuild."
---
Modern web applications should include at least a few tests, and increasingly those tests are
[integration tests][func-test]{:target="_blank"} instead of unit tests. Integration tests (or "system tests" or
"functional tests") prove that an application works the way *the business needs*, rather than *the way a developer
designed it* (i.e. unit tests). In a web app, that often means using Selenium to connect into Google Chrome, Firefox,
etc., and simulating the clicks and keypresses that a user performs. Selenium is easy to set up on your development
machine, and you can have your first test written within a few hours.

But adding your integration tests into your CI environment, which doesn't have a browser or even a window system, like
x11, is a much larger task. Thanks to [docker-selenium][d-sel]{:target="_blank"} and [@dtinth][dtinth]{:target="_blank"},
we're able to launch a pre-configured Google Chrome and record the test run to an MP4 video (so we can watch any failures).

Let's dive into a `buildspec.yml` for AWS CodeBuild that lets us run Selenium:

```yaml
version: 0.2
env:
  variables:
    APP_TARGET_URL: https://qa1.example.com
  secrets-manager:
    APP_CREDENTIALS: MySecretsManagerItem:app_credentials
phases:
  install:
    runtime-versions:
      docker: 18
      nodejs: 10
    commands:
      - docker pull selenium/standalone-chrome:latest
      - npm install
  pre_build:
    commands:
      - docker run -d -p 4444:4444 -v /dev/shm:/dev/shm --name selenium selenium/standalone-chrome:latest
      - docker exec -u 0 selenium /bin/bash -c 'apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*'
      - docker exec -d selenium ffmpeg -video_size 1360x1020 -framerate 15 -f x11grab -i :99.0 -vf format=yuv420p /home/seluser/recording.mp4
  build:
    commands:
      - |
        SELENIUM_SERVER_URL="http://localhost:4444/wd/hub" \
        SELENIUM_BROWSER="chrome" \
        npm run test -- \
          --format json:test-integration/report.json \
          --format node_modules/cucumber-pretty
  post_build:
    commands:
      - docker exec selenium pgrep ffmpeg > pidfile
      - docker exec selenium kill -INT $(cat pidfile)
      - docker exec selenium /bin/bash -c "while \$(kill -0 $(cat pidfile) 2>/dev/null); do sleep 1; done"
      - docker cp selenium:/home/seluser/recording.mp4 recording.mp4
artifacts:
  files:
    - recording.mp4
reports:
  Selenium:
    file-format: CucumberJson
    files:
      - test-integration/report.json
```

<small>Note: You can find a more advanced approach to using FFmpeg recording in my newer post about
[Recording a Selenium Test Suite Video with FFmpeg][selvid]. It's pretty cool!</small>

Let's take a closer look at what's going on in this `buildspec.yml` to get our test suite running.

### `env:`

Here, we are defining the `APP_TARGET_URL` and `APP_CREDENTIALS` environment variables. In my test suite, I decode the
`APP_CREDENTIALS` environment variable (a JSON string) within the testing code... if that's not your process, you can
remove or change these variables.

### `phases: install:` and `phases: pre_build:`

This phase tells AWS CodeBuild to ensure that NodeJS and Docker are installed on the machine that runs our job. We also
download our dependencies, like the `docker-selenium` image, `npm` packages, and we launch the latest
`selenium/standalone-chrome` image and configure `ffmpeg` to start video recording.

Because we're connecting to the docker host to run a container, we **need to configure AWS CodeBuild for
[Privileged Mode][aws-priv]{:target="_blank"}**.

### `phases: build:`

We use `npm run test` to start our test suite and apply a few environment variables that our testing code will need,
like which browser to use and where to connect to Selenium. In my code, I'm using `cucumber-js` internally, so I also
configure a JSON reporter that AWS CodeBuild can parse after the test run.

### `phases: post_build:`

Finally, we need to gracefully stop `ffmpeg` and copy the recording outward from the docker container. We do this
by finding the PID of this process, sending it `SIGINT` and then polling that PID until it's stopped executing. Once we
know it's done, we copy the video file to the build machine.

### `artifacts:` and `reports:`

This is where we tell AWS CodeBuild to take our results and store them somewhere within our AWS account. Because I'm
using `cucumber-js` and AWS CodeBuild includes a native `CucumberJson` parser, I'm able to see rich reports in the AWS
Management Console. If you're not using Cucumber reporting, you can remove the `reports:` section, or see if your
tool can output a JUnit or other AWS CodeBuild compatible report.

Since we artifact a video recording, we **need to configure AWS CodeBuild to
[store artifacts in S3][aws-priv]{:target="_blank"}**.

### Next Steps

There are a few natural next steps that I'm not getting into with this guide. Feel free to make improvements on this
`codebuild.yml` file for your project.

Here are some things you might want to try:

- Use a build variable for which browser to run, like Chrome and Firefox.
- Build the FFmpeg-installed docker image ahead of time (*only if you're comfortable rebuilding that image every time
  a new Google Chrome/docker-selenium image is published).
- Read my [next guide][selvid]{:target="_blank"} on more advanced FFmpeg integration with Selenium.

Stay tuned for a future guide, where we dive into deploying our application using Terraform in AWS CodeBuild, and then
tie the whole thing together using an AWS CodePipeline to run all our CI/CD jobs back-to-back upon code changes.

If you have any questions about this article, please leave your feedback by reaching out to me on
Twitter—[@hnryjms](https://twitter.com/hnryjms "@hnryjms on Twitter"), or give me a follow if you want to read more 💬 

[func-test]: https://wiki.c2.com/?CanFunctionalTestsReplaceUnitTests
[d-sel]: https://github.com/SeleniumHQ/docker-selenium
[dtinth]: https://github.com/SeleniumHQ/docker-selenium/issues/148#issuecomment-278024174
[selvid]: {{ site.url }}/2020/04/record-selenium/
[aws-priv]: https://docs.aws.amazon.com/codebuild/latest/userguide/change-project.html
