---
layout: post
title:  "Autoscaling Amazon ECS Infrastructure Managed in OpsWorks"
summary: "Article Summary"
---
AWS [EC2 Container Service][ecs]{:target="_blank"} stores, runs and manages Docker images and tasks across your cluster
of servers, but it falls short at bringing you the infrastructure needed to spin up quickly. To use AWS ECS, you need
to hook in your own servers running the `ecs-agent`, and as utilization fills up, more servers need to be added. My
team at [HouseRater][houserater]{:target="_blank"} has built our own frameworks for autoscaling ECS infrastructure
while still allowing servers to be managed in AWS [OpsWorks][opsworks]{:target="_blank"}, for managed team SSH access.

<small>Note: This automation can be replaced with AWS [Fargate][fargate]. Will my team migrate to Fargate? Hopefully very
soon, yes, but this guide could still be useful if AWS Fargate doesn't fit your needs.</small>

### AWS Service Setup

First, we need the OpsWorks Stack and Layer that will hold all AWS ECS servers. You can create this in the AWS Console,
under the OpsWorks service. Open the layer page from the Layers sidebar tab, and look at the URL. It should end with

```
#/stack/______/layers/______/general
```

Which you can use for the ID's for each layer. We're going to need both these ID's in our setup script. Next, we're
going to set up our ECS Cluster. We've got a few quirks of the AWS ECS Console to avoid using AWS Fargate.

1. Launch the AWS ECS Console
1. Select "Get Started" (which will automatically start the Fargate setup guide), and select "Cancel"
1. Select "Create Cluster"
1. Flip to EC2 Linux + Networking, check "Create an empty cluster", and finish the setup

Now we also have our cluster, and there are no ID's for clusters (only their cluster names). We'll need that in our
setup script too. 


### Server Provisioning

When building our infrastructure, my team built automation to handle the cases we see frequently. Those infrastructure
cases are below.

* Servers need to launch when a cluster's capacity starts getting low
* Servers need to die when the cluster has too much capacity
* Servers need to be managed in OpsWorks so they can be accessed over SSH
* Servers need to die when their disk gets so full that they can't clone new docker images
* Servers need to die if they failed to actually get registered in OpsWorks

When servers die, we're not so worried about the app going down, since ECS will relaunch any terminated tasks shortly
after, and we'll always have several of each task running to handle app load. Autoscaling handles the top two cases
generally on it's own, but we'll need the autoscale user data script to handle the bottom two.

To make management easy, you'll want to commit the user-data script, and configure the autoscaling task to run your
script over `curl ______ | sh`. We'll set this up in a second.

```bash
OPSWORKS_REGION="us-east-1"
ECS_CLUSTER="______"
OPSWORKS_STACK_ID="______"
OPSWORKS_LAYER_ID="______"

echo "ECS_CLUSTER=$ECS_CLUSTER" >> /etc/ecs/ecs.config

# CloudWatch Disk Utilization, based on code available here:
# https://gist.github.com/imaifactory/5857793

sudo yum install unzip perl-Switch perl-DateTime perl-Sys-Syslog perl-LWP-Protocol-https perl-Digest-SHA.x86_64 --assumeyes

curl http://ec2-downloads.s3.amazonaws.com/cloudwatch-samples/CloudWatchMonitoringScripts-v1.1.0.zip -o /home/ec2-user/CloudWatchMonitoringScripts.zip
unzip /home/ec2-user/CloudWatchMonitoringScripts.zip -d /home/ec2-user
rm -f /home/ec2-user/CloudWatchMonitoringScripts.zip
chown ec2-user:ec2-user /home/ec2-user/aws-scripts-mon
echo "*/5 * * * * ec2-user /home/ec2-user/aws-scripts-mon/mon-put-instance-data.pl --disk-space-util --disk-path=/ --from-cron" >> /etc/crontab
/etc/init.d/crond reload

# OpsWorks Instance Registration, based on code available here:
# http://lrascao.github.io/opsworks-provisioned-auto-scaling-groups/

sudo yum install aws-cli jq --assumeyes

sudo mkdir -p /etc/chef/ohai/hints
echo > /etc/chef/ohai/hints/ec2.json

INSTANCE_ID=`curl http://169.254.169.254/latest/meta-data/instance-id`
EC2_AVAIL_ZONE=`curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone`
EC2_REGION="`echo \"$EC2_AVAIL_ZONE\" | sed -e 's:\([0-9][0-9]*\)[a-z]*\$:\\1:'`"

aws opsworks get-hostname-suggestion --region $OPSWORKS_REGION --layer-id $OPSWORKS_LAYER_ID > /tmp/hostname-suggestion.json
HOSTNAME_SUGGESTION=`eval "cat /tmp/hostname-suggestion.json | jq '.Hostname'"`
HOSTNAME_SUGGESTION=`echo $HOSTNAME_SUGGESTION | tr -d '"'`

aws ec2 create-tags --region $EC2_REGION --resources $INSTANCE_ID --tags Key=Name,Value="$ECS_CLUSTER ECS - $HOSTNAME_SUGGESTION"

aws opsworks register --region $OPSWORKS_REGION --stack-id $OPSWORKS_STACK_ID --infrastructure-class ec2 --override-hostname $HOSTNAME_SUGGESTION --local --use-instance-profile

aws opsworks describe-instances --region $OPSWORKS_REGION --stack-id $OPSWORKS_STACK_ID > /tmp/stack.json
OPSWORKS_INSTANCE_ID=`eval "cat /tmp/stack.json | jq '.Instances[] | select(.Ec2InstanceId == \"$INSTANCE_ID\").InstanceId'"`
OPSWORKS_INSTANCE_ID=`echo $OPSWORKS_INSTANCE_ID | tr -d '"'`

OPSWORKS_INSTANCE_STATUS="unknown"
while [  "$OPSWORKS_INSTANCE_STATUS" != "registered" ]; do
    aws opsworks describe-instances --region $OPSWORKS_REGION --instance-ids $OPSWORKS_INSTANCE_ID > /tmp/instance.json
    OPSWORKS_INSTANCE_STATUS=`eval "cat /tmp/instance.json | jq '.Instances[] | select(.Ec2InstanceId == \"$INSTANCE_ID\").Status'"`
    OPSWORKS_INSTANCE_STATUS=`echo $OPSWORKS_INSTANCE_STATUS | tr -d '"'`
    echo -n "."
    sleep 5
done

aws opsworks assign-instance --region $OPSWORKS_REGION --instance-id $OPSWORKS_INSTANCE_ID --layer-id $OPSWORKS_LAYER_ID

aws ec2 modify-instance-attribute --region $EC2_REGION --instance-id $INSTANCE_ID --no-disable-api-termination
```

Charmingly, registering with OpsWorks causes the instance to enable termination protection, which then breaks the
autoscale group...so we have to shut it off using the misleading terminal command `--no-disable-api-termination`

### The EC2 Autoscaling Group

We're going to need our Launch Configuration and Autoscaling Group for EC2 servers.

### Cleaning Up Failures

We hope that instances always succeed their provisioning, but sometimes OpsWorks rejects new servers for reasons we
have not yet figured out 🤷‍♂️ so we just gotta clean up our failures. We also need to be cautious of termination
protection, since it really means nothing anymore, because OpsWorks just decided to enable it without our consent.

We'll use a daily AWS Lambda job to scan through services and remove anything that doesn't look right.

[houserater]: https://www.houserater.com
[ecs]: https://aws.amazon.com/ecs/
[opsworks]: https://aws.amazon.com/opsworks/
[fargate]: https://aws.amazon.com/fargate/
