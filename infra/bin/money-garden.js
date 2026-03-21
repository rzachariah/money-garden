#!/usr/bin/env node
const cdk = require("aws-cdk-lib");
const { MoneyGardenStack } = require("../lib/money-garden-stack");

const app = new cdk.App();

new MoneyGardenStack(app, "MoneyGardenStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION
  }
});
