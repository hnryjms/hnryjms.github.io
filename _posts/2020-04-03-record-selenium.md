---
layout: post
title:  "Recording a Selenium Test Suite Video in CI with FFmpeg"
summary: "We can record Selenium test runs just like the AWS DeviceFarm or SauceLabs, using FFmpeg. We also can add the
current test name to the top corner of the video"
---
As hinted in my [previous article][awssel] about Selenium in CI, recording a video of the test suite has been part of
my most recent project. Some hosted Selenium services, like AWS DeviceFarm or SauceLabs provide videos of your test
runs, but those services can be expensive or forbidden based on your organization's policies.

We can have videos just like the paid services, as long as we can install [FFmpeg][ffmpeg]{:target="_blank"} on our
build machine.

![Screenshot of Selenium recording]({{ site.url }}/assets/selenium_caption.png)

<small>Do you notice the test name in the top left corner?</small>

<!-- First, let's consider why these videos are useful. Typically, when developers are writing integration tests, they're
running Google Chrome/Firefox/etc. on their computer, and can see Selenium click around the web app. The test runs until
it reaches any undefined test step, and the developer sees what to do next and writes the code. You can see why many
error conditions, like a 3rd party service going down, don't often get handled in the suite; so the code passes when
written, but eventually runs flaky or fails. Our CI machine could also have different network or proxy configurations
that prevent a certain test from running. Recording a video lets us see what those problems are, just like the developer
saw while writing the test. And that means we can improve the flaky code more quickly & accurately. -->

Recording the screen of the build machine seems pretty straight forward. Start the capture before the suite runs, and
stop it when it ends. *Which is fine*. Until a test in the middle of your suite starts to fail. You've got the
recording, but no idea how many seconds into the recording is going to show you the failure. And there are only a few
frames of video before the test suite moves on. To mitigate this, we are going to add the current test name to the top
corner of the video.

Here's what it looks like:

```bash
rm /home/seluser/recording.mp4
echo > /home/seluser/cmds
tail -f /home/seluser/cmds | ffmpeg \
    -video_size 1360x1020 \
    -framerate 15 \
    -f x11grab -i :0.0 \
    -vf "drawtext=fontfile=/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf \
        :text=Loading \
        :fontcolor=white \
        :fontsize=24 \
        :box=1 \
        :boxcolor=black@0.5 \
        :x=0 \
        :y=0, \
        format=yuv420p" \
    /home/seluser/recording.mp4 &
export FFMPEG_PID=$!
```

<small>Note: The `x11grab -i :0.0` chunk will change based on your OS. You can read all about the capture tool for your
OS on the [FFmpeg Capture/Desktop][ffmpeg-desktop]{:target="_blank"} guide. Some formats don't require an explicit
`-video_size` parameter to capture the full screen.</small>

We use `tail -f` to feed text to STDIN of FFmpeg so that we can execute commands as if the interactive terminal window
is open. It's hacky, but it works. In our test suite, using a `Before()` hook that runs when an individual test starts,
we just need to append text to our `tail`'d file:

```bash
echo "cdrawtext -1 reinit text='${test-description}'" >> /home/seluser/cmds
```

<small>Note: You'll likely want to use the native `Fs.appendFile()` operation of your runtime language (NodeJS in my
example), rather than creating a subshell.</small>

When our test suite is complete, we'll need to terminate the FFmpeg program gracefully, so that it doesn't leave us with
a corrupt video recording. We can do that by sending the `q` key to the tool's STDIN, and wait for it's PID to complete.

```bash
echo q >> /home/seluser/cmds
wait $FFMPEG_PID
```

Now just store our video (in my case available at `/home/seluser/recording.mp4`) as a build artifact, and we're done!

### How it Works

If you're confused about what's going on, read on for a guide about what each piece of the commands above is doing.
Let's take a closer look at what's going on:

1. `rm /home/seluser/recording.mp4` - We need to make sure a previous run's video is removed, otherwise FFmpeg will
  hang, waiting for you to answer whether you want to overwrite the file.
1. `echo > /home/seluser/cmds` - reset the file to empty (in case it already exists). Otherwise, as soon as FFmpeg
  starts, it'll process the last few commands of the previous run (via `tail -f`).
1. `ffmpeg (...)` - start interactive mode of FFmpeg, but feeding `tail -f` as the input.
    1. `-video_size 1360x1020` - The `x11grab` tool isn't able to determine the screen size automatically. For my machine
      (docker-selenium), the computer is running with a `1360x1020` screen size.
    1. `-framerate 15` - The frequency a screenshot should be captured. This will reduce large file sizes, but make videos
      more choppy if too low.
    1. `-f x11grab -i :0.0` - For a linux machine, `x11` is the desktop rendering engine, and `x11grab` is the tool that
      captures the `x11` screen. Our main screen is identified as `:0`, but some computers may use `:99` or a different
      number.
    1. `-vf (...)`
        1. `drawtext=(...)` - Adds text to the top corner of the screen. This is the command that we send commands to
          as the recording is in-flight.
            1. `fontfile=/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf` - A path to a TTF file that the text will
              render. Make sure you update this path based on your OS.
            1. `text=Loading` - Start the recording with "Loading" as the text.
            1. `fontcolor=white` - Render the text in white (we'll add a background too).
            1. `fontsize=24` - Render the text at 24 pixels in size.
            1. `box=1` - Add a background box behind the text, so we can see it if there's white on the underlying video.
            1. `boxcolor=black@0.5` - Render the background box in black, with 50% transparency.
            1. `x=0` - Position the box to the left.
            1. `y=0,` - Position the box to the top.
        1. `format=yuv420p` - Uses a colorspace that QuickTime Player and Windows Media Player can open.
    1. `/home/seluser/recording.mp4` - The path to our output file.
    1. `&` - Runs the command in the background.
1. `export FFMPEG_PID=$!` - Save the PID of the background command, so we can use it later.

The interactive mode of FFmpeg watches for the `c` keypress, and renders a special view for inputting the command to
send. That's why there's no space between `c` and `drawtext`.

1. `echo (...)` - Repeat the text.
    1. `c` - Enter the command submission view in interactive mode.
    1. `drawtext` - The video_filter (`-vf`) where we are sending a command.
    1. `-1` - Apply the command with no delay.
    1. `reinit` - Merge the next argument into the init arguments.
    1. `text='${test-description}'` - This is where we'll specify the text, as the test name coming from our test runner.
    1. `>> /home/seluser/cmds` - Append to the file (rather than replace it, single `>`). 

Finally, we wrap up our recording when the test is done executing.

1. `echo q >> /home/seluser/cmds` - Tell interactive mode of FFmpeg to gracefully shut down.
1. `wait $FFMPEG_PID` - Watch the background process and pause until it's complete.<br />
  <small>Note: you can only `wait` a PID that was launched from the same `/bin/bash` program. If your CI creates a new
  shell for each command, you'll need to do [something like this][so-wait]{:target="_blank"} instead.</small>

### Next Steps

There are a few ways you can improve the ideas I've explained in this guide to make the process more reliable,
readable and less hacky all around.

Try one of these:

- Install [FFmpeg with `--enable-libzmq`][ffmpeg-zmq]{:target="_blank"} and use [ZeroMQ][zmq]{:target="_blank"} in your
  native test language to execute the command. This would be a big improvement over `tail -f` and appending commands to
  STDIN of FFmpeg.
- Integrate this update into my other guide, [Running Selenium Test Suite in AWS CodeBuild][awssel] to use a cloud-based
  CI platform in Amazon Web Services.

Stay tuned for a future guide, where we tie our build (`npm`), deploy (`terraform`) and test (Selenium) jobs together
in an AWS CodePipeline to move code changes to production automatically.

If you have any questions about this article, please leave your feedback by reaching out to me on
Twitter—[@hnryjms](https://twitter.com/hnryjms "@hnryjms on Twitter"), or give me a follow if you want to read more 💬 

[awssel]: {{ site.url }}/2020/03/aws-codebuild-selenium/
[ffmpeg]: https://ffmpeg.org
[ffmpeg-desktop]: https://trac.ffmpeg.org/wiki/Capture/Desktop
[so-wait]: https://unix.stackexchange.com/a/427133
[ffmpeg-zmq]: https://ffmpeg.org/ffmpeg-filters.html#zmq_002c-azmq
[zmq]: https://zeromq.org
