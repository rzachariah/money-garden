const cdk = require("aws-cdk-lib");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const ecsPatterns = require("aws-cdk-lib/aws-ecs-patterns");
const route53 = require("aws-cdk-lib/aws-route53");

class MoneyGardenStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    const publishableKey = new cdk.CfnParameter(this, "ClerkPublishableKey", {
      type: "String",
      description: "Clerk publishable key for the Money Garden frontend."
    });

    const secretKey = new cdk.CfnParameter(this, "ClerkSecretKey", {
      type: "String",
      noEcho: true,
      description: "Clerk secret key for server-side auth."
    });

    const signInUrl = new cdk.CfnParameter(this, "ClerkSignInUrl", {
      type: "String",
      default: "/sign-in"
    });

    const signUpUrl = new cdk.CfnParameter(this, "ClerkSignUpUrl", {
      type: "String",
      default: "/sign-up"
    });

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      hostedZoneId: "Z06009943OINXQBYFNK47",
      zoneName: "ranjithzachariah.com"
    });

    const domainName = "moneygarden.ranjithzachariah.com";

    const certificate = new acm.Certificate(this, "Certificate", {
      domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC
        }
      ]
    });

    const cluster = new ecs.Cluster(this, "Cluster", { vpc });

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "Web", {
      cluster,
      publicLoadBalancer: true,
      domainName,
      domainZone: hostedZone,
      certificate,
      redirectHTTP: true,
      assignPublicIp: true,
      desiredCount: 1,
      cpu: 512,
      memoryLimitMiB: 1024,
      taskSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      minHealthyPercent: 0,
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset("."),
        containerPort: 3000,
        environment: {
          NODE_ENV: "production",
          PORT: "3000",
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey.valueAsString,
          CLERK_SECRET_KEY: secretKey.valueAsString,
          NEXT_PUBLIC_CLERK_SIGN_IN_URL: signInUrl.valueAsString,
          NEXT_PUBLIC_CLERK_SIGN_UP_URL: signUpUrl.valueAsString,
          NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: "/dashboard",
          NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: "/dashboard"
        }
      }
    });

    service.loadBalancer.connections.allowFromAnyIpv4(
      ec2.Port.tcp(443),
      "Allow from anyone on port 443"
    );

    service.targetGroup.configureHealthCheck({
      path: "/",
      healthyHttpCodes: "200-399"
    });

    new cdk.CfnOutput(this, "AppUrl", {
      value: `https://${domainName}`
    });

    new cdk.CfnOutput(this, "AlbUrl", {
      value: `http://${service.loadBalancer.loadBalancerDnsName}`
    });
  }
}

module.exports = { MoneyGardenStack };
