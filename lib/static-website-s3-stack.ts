import { RemovalPolicy, aws_iam as iam, aws_s3 as s3, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CONSTANTS } from './static-website-constants';

export class StaticWebsiteS3Stack extends Stack {
  private readonly websiteBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create S3 bucket to host the static files
    this.websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      blockPublicAccess: {
        blockPublicAcls: true,
        blockPublicPolicy: false,
        ignorePublicAcls: true,
        restrictPublicBuckets: false
      },
      bucketName: CONSTANTS.WebsiteBucketName,
      websiteIndexDocument: 'index.html',
      removalPolicy: RemovalPolicy.DESTROY
    })
  }

  addVpcePolicyToBucket(vpceId: string): void {
    // Allow only VPCE principal to get objects from S3
    this.websiteBucket.addToResourcePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()],
      actions: ['s3:GetObject'],
      resources: [`arn:aws:s3:::${CONSTANTS.WebsiteBucketName}/*`],
      conditions: {
        StringEquals: {
          "aws:SourceVpce": vpceId
        }
      }
    }))
  }
}
