---
layout: post
title:  "Run WordPress in Docker on AWS using Terraform"
summary: "Article Summary"
---
Hosting a [WordPress.org][wp]{:target="_blank"} website can be a challenge, and selecting a hosting
provider can be an equally overwhelming task. Knowing how and when to scale your website can make
running your site too difficult, especially when you're also managing other parts of the business.

There's an easier way to run WordPress yourself in AWS, and even qualify for the free usage tier from
Amazon for an entire year. With [Terraform][tf]{:target="_blank"}, we can define the infrastructure of
our app as code files, and launch many AWS resources with one command. Using the code below, we're able
to launch a powerful website, backed by a CDN and served over HTTPS for free.

<small>Note: this article is an extension & Terraform adaption of
[this guide on the AWS blog][manual-guide]{:target="_blank"}.</small>

Once we have Terraform installed and configured to our AWS account (check out [guides like this][tf-aws]{:target="_blank"}
to get started), we can create our new `main.tf` file to start writing our infrastructure. Let's take
a look at what our main file will include.

```hcl-terraform
variable "aws_region" {}
variable "vpc_cidr" {}

provider "aws" {
  region = var.aws_region
}
```

We're defining a few variables that we'll get into later, and telling Terraform the AWS region we'll be
using for our resources. Next, we'll need a VPC to hold our resources—think of a VPC & subnets like a
folders for the computers Amazon will run for us—we'll make `vpc.tf` for this.

```hcl-terraform
resource "aws_vpc" "vpc" {
  cidr_block = var.vpc_cidr
  enable_dns_hostnames = true

  tags = {
    Name = "WordPress VPC"
  }
}

resource "aws_internet_gateway" "public" {
  vpc_id = aws_vpc.vpc.id
}

resource "aws_subnet" "public" {
  cidr_block = cidrsubnet(var.vpc_cidr, 1, 0)
  vpc_id = aws_vpc.vpc.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.public.id
  }
}

resource "aws_route_table_association" "public" {
  route_table_id = aws_route_table.public.id
  subnet_id = aws_subnet.public.id
}

resource "aws_subnet" "private" {
  cidr_block = cidrsubnet(var.vpc_cidr, 1, 1)
  vpc_id = aws_vpc.vpc.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.vpc.id
}

resource "aws_route_table_association" "private" {
  route_table_id = aws_route_table.private.id
  subnet_id = aws_subnet.private.id
}
```

Now that we have our public & private VPC subnets, we're able to create an RDS instance to run the
database powering our WordPress environment—let's use `rds.tf` for this.

```hcl-terraform
resource "random_string" "password" {
  length = 16
  special = true
  override_special = "/@\" "
}

resource "aws_db_instance" "database" {
  identifier = "wordpress-database"
  allocated_storage = 20
  engine = "mariadb"
  engine_version = "10.3"
  instance_class = var.db_instance_type
  name = "wordpress-database"
  username = "wordpress"
  password = random_string.password.result
  vpc_security_group_ids = [ aws_security_group.database.id ]
  db_subnet_group_name = aws_db_subnet_group.database.id
}

resource "aws_security_group" "default" {
  name = "wordpress-database-security"
  description = "Allow inbound traffic from public subnet"
  vpc_id = aws_vpc.vpc.id

  ingress {
    from_port = 0
    to_port = 65535
    protocol = "TCP"
    cidr_blocks = [ aws_subnet.public.id ]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "database" {
  name = "wordpress-database-subnets"
  description = "The private subnets of our VPC"
  subnet_ids  = [ aws_subnet.private.id ]
}
```

Next, we need the EC2 server that will run our WordPress code. We're going to run this instance in
an auto-scaling group of 1, which means any server issue will automatically be resolved by rebuilding
the instance.

<small>Note: there are a few implications of this, particularly with persistent uploaded content.
Stay tuned for a future guide, on synchronizing your `wp-content/` directory with S3, to ensure
uploads and plugin data is always available.</small>

Create a new `ec2.tf` file for the code below.

```hcl-terraform
TBD
```

Two left. We're making great progress. Now we need to configure ECS, the docker service from Amazon,
to run WordPress on our EC2 server. We'll call this one `ecs.tf`

```hcl-terraform
TBD
```

Finally, we're ready to setup the CDN and HTTPS certificate. We can call this one `cloudfront.tf` to
manage the CDN information.

```hcl-terraform
TBD
```

Okay. To wrap it up, lets define the variables, and explain a little about what they're doing.
This is going to go in a `main.tfvars` file.

```hcl-terraform
aws_region = "us-east-1"
vpc_cidr = "10.0.0.0/24"
ec2_instance_ami = "ami-0b16d80945b1a9c7d"
ec2_instance_type = "t2.micro"
rds_instance_type = "db.t2.micro"

# this is the domain where we'll access our website
host_domain = "www.hnryjms.io"
```

We're ready to launch our website. Terraform makes this easy with just two terminal commands.

```bash
terraform init
terraform apply -var-file main.tfvars
```

[wp]: https://wordpress.org
[tf]: https://www.terraform.io
[manual-guide]: https://aws.amazon.com/blogs/startups/how-to-accelerate-your-wordpress-site-with-amazon-cloudfront/
[tf-aws]: https://learn.hashicorp.com/terraform/getting-started/install.html
