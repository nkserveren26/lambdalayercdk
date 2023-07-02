#!/usr/bin/env node
import { LambdalayercdkStack } from '../lib/lambdalayercdk-stack';
import { App } from 'aws-cdk-lib';

const app = new App();
new LambdalayercdkStack(app, 'LambdalayercdkStack', {
  
});