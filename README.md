# LambdaレイヤーをCDKでデプロイ

本リポジトリはLambdaレイヤーをCDKでデプロイするリポジトリです。

# 前提
以下がインストール済み  
- CDK（ver 2.67.0）
- Docker Desktop
- yarn

CDKの言語：TypeScript  
AWS CLI：デフォルトプロファイルが設定済み  
Docker DesktopはCDKでのデプロイを実行するときに使います。

# 実装内容
Pythonで動くLambdaレイヤーと、レイヤーを使用するLambdaを実装します。  
Lambdaのソースコードは以下です。  
numpyライブラリのモジュールを使って、ランダムに乱数を生成するだけのシンプルな内容です。  
Lambdaレイヤーには、numpyライブラリを含めて実装します。
``` index.py
import numpy

def handler(event, context):
    # 乱数を生成
    print(numpy.random.rand())
```

# 各ディレクトリについて

・lambdaディレクトリ  
LambdaレイヤーとLambda関数のファイルを配置。
- testフォルダ：Lambda関数を実行するコードを配置するフォルダ
- layerフォルダ：Lambdaレイヤーのデプロイに必要なファイルを配置するフォルダ（requirements.txtを配置）  
requirements.txtにはnumpyを記載
``` requirements.txt
numpy
```
・libディレクトリ  
スタックが定義されたソースコードが配置されたディレクトリ

・binディレクトリ  
CDKのデプロイ時に実行されるファイルが配置されたディレクトリ

# 手順

## CDKの初期化とライブラリのインストール
まず、CDKの作業ディレクトリに移動し、以下のコマンドを実行します。
``` sh
$ cdk init --lang typescript
```


次に以下のパッケージをインストールします。  
バージョンは2.83.1-alpha.0を指定します。  
（これ以降のバージョンではエラーが出てデプロイに失敗します）
``` sh
$ yarn add @aws-cdk/aws-lambda-python-alpha@^2.83.1-alpha.0
```

## 実装内容
CDKのソースコードについて説明します。

以下は、Lambdaレイヤーとレイヤーを利用するLambdaを実装するCDKスタックのコードです。
``` lambdalayercdk-stack.ts
import { AssetCode, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class LambdalayercdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const lambdaParams = {
      functionName: "lambdaFunction",
      lambdaRoleName: "lambdaRole",
      layerName: "lambdaLayer",
      codePath: "lambda/test",
    };

    const lambdaRole: Role = new Role(this, lambdaParams.lambdaRoleName, {
      roleName: lambdaParams.lambdaRoleName,
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")]
    });

    const lambdaLayer: PythonLayerVersion = new PythonLayerVersion(this, lambdaParams.layerName, {
      layerVersionName: lambdaParams.layerName,
      entry: "lambda/layer",
      compatibleRuntimes: [Runtime.PYTHON_3_9],
    });

    const lambdafunc: Function = new Function(this, lambdaParams.functionName, {
      functionName: lambdaParams.functionName,
      runtime: Runtime.PYTHON_3_9,
      code: AssetCode.fromAsset(lambdaParams.codePath),
      role: lambdaRole,
      handler: "index.handler",
      layers: [lambdaLayer],
    });
  }
}
```

実装する各リソースを以下に解説します。  
lambdaRoleは、レイヤーを使うLambdaに付与するIAMロールです。
``` lambdalayercdk-stack.ts
const lambdaRole: Role = new Role(this, lambdaParams.lambdaRoleName, {
      roleName: lambdaParams.lambdaRoleName,
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")]
    });
```

lambdaLayerが、本記事のメインであるLambdaレイヤーです。  
PythonLayerVersionは、Pythonで動くLambdaレイヤーのクラスになります。  
（インストールしたaws-lambda-python-alphaライブラリに含まれます）  
entryプロパティに、requirements.txtを配置したディレクトリのパスを記載します。  
（パスは、作業ディレクトリを起点とする相対パス）
``` lambdalayercdk-stack.ts
const lambdaLayer: PythonLayerVersion = new PythonLayerVersion(this, lambdaParams.layerName, {
      layerVersionName: lambdaParams.layerName,
      entry: "lambda/layer",
      compatibleRuntimes: [Runtime.PYTHON_3_9],
});
```

lambdafuncがLambda関数になります。  
layersプロパティに、↑で宣言したlambdaLayerを指定します。  
layersプロパティは型が配列なので、配列で指定します。
``` lambdalayercdk-stack.ts
const lambdafunc: Function = new Function(this, lambdaParams.functionName, {
      functionName: lambdaParams.functionName,
      runtime: Runtime.PYTHON_3_9,
      code: AssetCode.fromAsset(lambdaParams.codePath),
      role: lambdaRole,
      handler: "index.handler",
      layers: [lambdaLayer],
});
```

## デプロイ
カレントディレクトリを作業ディレクトリにした状態で以下のコマンドを実行します。
``` sh
$ cdk deploy
```

コマンド実行後、以下のメッセージが表示されればデプロイ成功です。
``` sh
✅  LambdalayercdkStack

✨  Deployment time: 50.91s
```

デプロイ実行時、エラーが出て失敗するケースがいくつかあります。  
以下に、ケース別トラブルシュートを記載します。

トラブルシュート①  
cdk deploy実行時、以下のエラーが出る場合  
Docker Desktopが起動していないことが原因です。  
Docker Desktopを起動しましょう。
```
error during connect: This error may indicate that the docker daemon is not running.: Post "http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.24/build?buildargs=%7B%22IMAGE%22%3A%22public.ecr.aws%2Fsam%2Fbuild-python3.9%22%7D&cachefrom=%5B%5D&cgroupparent=&cpuperiod=0&cpuquota=0&cpusetcpus=&cpusetmems=&cpushares=0&dockerfile=Dockerfile&labels=%7B%7D&memory=0&memswap=0&networkmode=default&platform=linux%2Famd64&rm=1&shmsize=0&t=cdk-a3cf09e124d1012c8446b8fbc9d3fb0af39864821bd92922a198a755b57cf1b6&target=&ulimits=null&version=1": open //./pipe/docker_engine: The system cannot find the file specified.C:\data\cdk\lambdalayercdk\node_modules\aws-cdk-lib\core\lib\private\asset-staging.js:4
stderr: ${proc.stderr?.toString().trim()}`):new Error(`${prog} exited with status ${proc.status}`);return proc}exports.dockerExec=dockerExec;
                                            ^
Error: docker exited with status 1
    at Object.dockerExec (C:\data\cdk\lambdalayercdk\node_modules\aws-cdk-lib\core\lib\private\asset-staging.js:4:45)
    at Function.fromBuild (C:\data\cdk\lambdalayercdk\node_modules\aws-cdk-lib\core\lib\bundling.js:1:4198)
    at new Bundling (C:\data\cdk\lambdalayercdk\node_modules\@aws-cdk\aws-lambda-python-alpha\lib\bundling.ts:100:39)
    at Function.bundle (C:\data\cdk\lambdalayercdk\node_modules\@aws-cdk\aws-lambda-python-alpha\lib\bundling.ts:61:44)
    at new PythonLayerVersion (C:\data\cdk\lambdalayercdk\node_modules\@aws-cdk\aws-lambda-python-alpha\lib\layer.ts:63:22)
    at Module.m._compile (C:\data\cdk\lambdalayercdk\node_modules\ts-node\src\index.ts:1618:23)
    at Module._extensions..js (node:internal/modules/cjs/loader:1180:10)

Subprocess exited with error 1
```

トラブルシュート②  
cdk deploy実行時、以下のエラーが出る場合
```
failed to get console mode for stdin: The handle is invalid.
[+] Building 2.2s (4/4) FINISHED
 => [internal] load build definition from Dockerfile                            0.1s 
 => => transferring dockerfile: 1.28kB                                          0.0s 
 => [internal] load .dockerignore                                               0.1s 
 => => transferring context: 2B                                                 0.0s 
 => ERROR [internal] load metadata for public.ecr.aws/sam/build-python3.9:late  2.0s 
 => [auth] aws:: sam/build-python3.9:pull token for public.ecr.aws              0.0s 
------
 > [internal] load metadata for public.ecr.aws/sam/build-python3.9:latest:
------
<以下略>
    
Subprocess exited with error 1
```
有効期限の切れた認証トークンが残ったままになっていて、それを使用してECRのパブリックレジストリにアクセスしたためにこのエラーが出ます。
このエラーは公式ドキュメントにも記載されてます。
https://docs.aws.amazon.com/ja_jp/AmazonECR/latest/public/public-troubleshooting.html#public-troubleshooting-authentication

なので、以下のコマンドを実行して認証トークンを削除すればエラーは解消されます。
```
docker logout public.ecr.aws
```

## Lambdaの確認
Lambdaがデプロイできたか確認します。  
Lambdaのコンソールに移動し、デプロイしたLambdaの画面に移動します。  
下図のようにLayersが表示されます。  
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/2485934/d189941a-2365-e3cd-b6c1-cc9311ed0541.png)

これをクリックすると、レイヤーに関する情報を確認できます。  
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/2485934/e0d80b9b-727a-e6bc-0d1a-c55f0bfc5260.png)


デプロイしたLambdaがちゃんと動くかテストを実行して確認します。  
テスト設定はすべてデフォルトで実行します。  
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/2485934/85129fba-69d7-eba4-6851-22098459ca6f.png)


以下のように、乱数が出力されていればOKです。
![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/2485934/578f7480-6700-4a54-f312-4ba542f1c22f.png)


# 参考資料

https://www.ranthebuilder.cloud/post/build-aws-lambda-layers-with-aws-cdk

