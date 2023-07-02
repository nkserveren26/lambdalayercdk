import { PythonLayerVersion } from '@aws-cdk/aws-lambda-python-alpha';
import { Stack,StackProps } from 'aws-cdk-lib';

import { AssetCode, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class LambdalayercdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const lambdaParams = {
      functionName: "lambdaFunction",
      layerName: "lambdaLayer",
      codePath: "lambda/test",
    };

    const lambdaLayer: PythonLayerVersion = new PythonLayerVersion(this, lambdaParams.layerName, {
      layerVersionName: lambdaParams.layerName,
      entry: "lambda/layer",
      compatibleRuntimes: [Runtime.PYTHON_3_9],
    });

    const lambdafunc: Function = new Function(this, lambdaParams.functionName, {
      functionName: lambdaParams.functionName,
      runtime: Runtime.PYTHON_3_9,
      code: AssetCode.fromAsset(lambdaParams.codePath),
      handler: "index.handler",
      layers: [lambdaLayer],
    });
  }
}
