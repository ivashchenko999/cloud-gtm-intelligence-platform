import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Stack, type StackProps, Duration, Fn, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  OriginRequestPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import type { IHttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import type { Construct } from 'constructs';

const currentDir = dirname(fileURLToPath(import.meta.url));
const defaultWebDist = join(currentDir, '..', '..', 'apps', 'web', 'dist');

export interface FrontendStackProps extends StackProps {
  /** HTTP API fronted under the CloudFront `/api/*` behavior. */
  readonly httpApi: IHttpApi;
  /** Built SPA assets to publish. Defaults to `apps/web/dist`. */
  readonly webDistPath?: string;
}

/**
 * Static SPA hosting: a private S3 bucket reachable only through CloudFront via
 * Origin Access Control. CloudFront serves the built assets and proxies
 * `/api/*` to the HTTP API so the browser talks to a single origin (no CORS).
 * SPA deep links fall back to `index.html`.
 */
export class FrontendStack extends Stack {
  public readonly bucket: Bucket;
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    this.bucket = new Bucket(this, 'SiteBucket', {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // API Gateway's endpoint is `https://{id}.execute-api.{region}.amazonaws.com`;
    // CloudFront origins take a bare domain, so drop the scheme.
    const apiDomain = Fn.select(2, Fn.split('/', props.httpApi.apiEndpoint));

    this.distribution = new Distribution(this, 'SiteDistribution', {
      comment: 'Cloud GTM Intelligence Platform frontend.',
      defaultRootObject: 'index.html',
      priceClass: PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new HttpOrigin(apiDomain),
          viewerProtocolPolicy: ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: AllowedMethods.ALLOW_ALL,
          cachePolicy: CachePolicy.CACHING_DISABLED,
          // API Gateway rejects a forwarded viewer Host header — send everything else.
          originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: Duration.minutes(5),
        },
      ],
    });

    new BucketDeployment(this, 'DeploySite', {
      sources: [Source.asset(props.webDistPath ?? defaultWebDist)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    new CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront domain serving the SPA.',
    });
    new CfnOutput(this, 'SiteUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'Public URL of the deployed application.',
    });
  }
}
