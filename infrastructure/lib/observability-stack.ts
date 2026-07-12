import { Stack, type StackProps, Duration } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  Dashboard,
  GraphWidget,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import type { IFunction } from 'aws-cdk-lib/aws-lambda';
import type { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import type { Construct } from 'constructs';

export interface ObservabilityStackProps extends StackProps {
  readonly handler: IFunction;
  readonly httpApi: HttpApi;
}

/**
 * Operational visibility for the running service: a single CloudWatch dashboard
 * plus alarms that fire on Lambda faults/throttles and API 5xx responses. Alarms
 * treat missing data as healthy so an idle service does not page.
 */
export class ObservabilityStack extends Stack {
  public readonly dashboard: Dashboard;

  constructor(scope: Construct, id: string, props: ObservabilityStackProps) {
    super(scope, id, props);

    const period = Duration.minutes(5);
    const lambdaErrors = props.handler.metricErrors({ period });
    const lambdaThrottles = props.handler.metricThrottles({ period });
    const lambdaDuration = props.handler.metricDuration({ period });
    const apiServerErrors = props.httpApi.metricServerError({ period });
    const apiClientErrors = props.httpApi.metricClientError({ period });
    const apiLatency = props.httpApi.metricLatency({ period });
    const apiCount = props.httpApi.metricCount({ period });

    new Alarm(this, 'ApiLambdaErrorsAlarm', {
      alarmName: 'cloud-gtm-api-lambda-errors',
      alarmDescription: 'API Lambda reported one or more errors in a 5-minute window.',
      metric: lambdaErrors,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    new Alarm(this, 'ApiLambdaThrottlesAlarm', {
      alarmName: 'cloud-gtm-api-lambda-throttles',
      alarmDescription: 'API Lambda was throttled in a 5-minute window.',
      metric: lambdaThrottles,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    new Alarm(this, 'ApiServerErrorsAlarm', {
      alarmName: 'cloud-gtm-api-5xx',
      alarmDescription: 'HTTP API returned 5xx responses in a 5-minute window.',
      metric: apiServerErrors,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    this.dashboard = new Dashboard(this, 'Dashboard', {
      dashboardName: 'cloud-gtm-platform',
    });
    this.dashboard.addWidgets(
      new GraphWidget({
        title: 'API requests & errors',
        left: [apiCount],
        right: [apiClientErrors, apiServerErrors],
        width: 12,
      }),
      new GraphWidget({
        title: 'API latency',
        left: [apiLatency],
        width: 12,
      }),
      new GraphWidget({
        title: 'Lambda errors & throttles',
        left: [lambdaErrors, lambdaThrottles],
        width: 12,
      }),
      new GraphWidget({
        title: 'Lambda duration',
        left: [lambdaDuration],
        width: 12,
      }),
    );
  }
}
