import { RemovalPolicy, aws_iam as iam, aws_ec2 as ec2, Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CONSTANTS } from './static-website-constants';
import { config } from 'dotenv';

// Import environment variables
config();

interface ISubnetMapping {
  privateSubnet: ec2.Subnet
  publicSubnet: ec2.Subnet
}

interface ISGMapping {
  privateSubnetSG: ec2.SecurityGroup
  publicSubnetSG: ec2.SecurityGroup
}

interface IIamRoleMapping {
  privateInstanceRole: iam.Role
  publicInstanceRole: iam.Role
}

interface IEc2InstancesProps extends ISubnetMapping, ISGMapping, IIamRoleMapping {
  // keyPair: ec2.CfnKeyPair
}

export class StaticWebsiteVpcStack extends Stack {
  private readonly vpc: ec2.IVpc;
  public readonly vpceId: string;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Reference default VPC
    this.vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {isDefault: true});

    // Method to create key pair to access EC2 instances
    // const keyPair = this.createKeyPair();
    
    // Method to create subnets
    const {privateSubnet, publicSubnet} = this.createSubnets();

    // Method to create security groups
    const {privateSubnetSG, publicSubnetSG} = this.createSecurityGroups();

    // Method to create IAM roles for EC2 instances to be created
    const {privateInstanceRole, publicInstanceRole} = this.createInstanceRoles();

    // Method to create EC2 instances
    this.createEc2Instances({
      privateSubnet,
      publicSubnet,
      privateSubnetSG,
      publicSubnetSG,
      privateInstanceRole,
      publicInstanceRole,
      // keyPair
    });

    // Method to create VPCE
    this.createVpceEndpoint(privateSubnet);
  }

  // private createKeyPair(): ec2.CfnKeyPair {
  //   // Create key pair
  //   const keyPair = new ec2.CfnKeyPair(this, 'EC2KeyPair', {
  //     keyName: CONSTANTS.Ec2KeyPair,
  //     tags: [{
  //       key: 'instanceType',
  //       value: 'private-public',
  //     }],
  //   });

  //   // Remove key pair upon stack destruction
  //   keyPair.applyRemovalPolicy(RemovalPolicy.DESTROY);

  //   // Return key pair
  //   return keyPair;
  // }

  private createSubnets(): ISubnetMapping {
    // Create private subnet to access AWS services via VPCE
    const privateSubnet = new ec2.Subnet(
      this,
      'PrivateSubnet',
      {
        availabilityZone: this.vpc.availabilityZones[0],
        cidrBlock: '172.31.48.0/20',
        vpcId: this.vpc.vpcId,
        mapPublicIpOnLaunch: false
      }
    )

    // Remove subnet upon stack destruction
    privateSubnet.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Create public subnet to be accessed from internet
    const publicSubnet = new ec2.Subnet(
      this,
      'PublicSubnet',
      {
        availabilityZone: this.vpc.availabilityZones[0],
        cidrBlock: '172.31.64.0/20',
        vpcId: this.vpc.vpcId,
        mapPublicIpOnLaunch: true
      }
    )

    // Add default route to the internet
    publicSubnet.addDefaultInternetRoute(
      // https://github.com/aws/aws-cdk/issues/5327
      // https://github.com/aws/aws-cdk/issues/19094
      process.env.IGW as string,  // existing default IGW
      this.vpc.internetConnectivityEstablished)

    // Remove subnet upon stack destruction
    publicSubnet.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Return subnets
    return {privateSubnet, publicSubnet}
  }

  private createSecurityGroups(): ISGMapping {
    // Create security group for private subnet instance from which we access S3
    const privateSubnetSG = new ec2.SecurityGroup(
      this,
      'PrivateSubnetSecurityGroup',
      {
        vpc: this.vpc,
        allowAllOutbound: true, // will let instance send outbound traffic
        securityGroupName: 'private-subnet-sg',
      }
    )

    // Allow ingress SSH on the SG
    privateSubnetSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH from public EC2 instance'
    );

    // Allow ingress HTTP on the SG
    privateSubnetSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic'
    );

    // Allow ingress HTTPS on the SG
    privateSubnetSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );

    // Remove security group upon stack destruction
    privateSubnetSG.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Create security group for public subnet instance to which we ssh
    const publicSubnetSG = new ec2.SecurityGroup(
      this,
      'PublicSubnetSecurityGroup',
      {
        vpc: this.vpc,
        allowAllOutbound: true, // will let instance send outbound traffic
        securityGroupName: 'public-subnet-sg',
      }
    )

    // Allow ingress SSH on the SG
    publicSubnetSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH from internet'
    );

    // Allow ingress HTTP on the SG
    publicSubnetSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic'
    );

    // Allow ingress HTTPS on the SG
    publicSubnetSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS traffic'
    );

    // Remove security group upon stack destruction
    publicSubnetSG.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Return security groups
    return {privateSubnetSG, publicSubnetSG}
  }

  private createInstanceRoles(): IIamRoleMapping {
    // Create private instance IAM role
    const privateInstanceRole = new iam.Role(
      this,
      'PrivateInstanceRole',
      {assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')}
    )

    // Remove IAM role upon stack destruction
    privateInstanceRole.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Create public instance IAM role
    const publicInstanceRole = new iam.Role(
      this,
      'PublicInstanceRole',
      {assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')}
    )

    // Remove IAM role upon stack destruction
    publicInstanceRole.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Return IAM roles
    return {privateInstanceRole, publicInstanceRole}
  }

  private createEc2Instances(props: IEc2InstancesProps): void {
    // Create private EC2 instance
    const privateInstance = new ec2.Instance(this, 'PrivateEc2Instance', {
      vpc: this.vpc,
      role: props.privateInstanceRole,
      securityGroup: props.privateSubnetSG,
      associatePublicIpAddress: false,
      vpcSubnets: this.vpc.selectSubnets({subnets: [props.privateSubnet]}),
      instanceName: 'private-instance',
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      // keyName: props.keyPair.keyName
      keyName: CONSTANTS.Ec2KeyPair
    })

    // Remove instance upon stack destruction
    privateInstance.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Create public EC2 instance
    const publicInstance = new ec2.Instance(this, 'PublicEc2Instance', {
      vpc: this.vpc,
      role: props.publicInstanceRole,
      securityGroup: props.publicSubnetSG,
      vpcSubnets: this.vpc.selectSubnets({subnets: [props.publicSubnet]}),
      instanceName: 'public-instance',
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2(),
      // keyName: props.keyPair.keyName
      keyName: CONSTANTS.Ec2KeyPair
    })

    // Remove instance upon stack destruction
    publicInstance.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }

  private createVpceEndpoint(privateSubnet: ec2.Subnet): void {
    // Create VPCEndpoint
    const vpce = new ec2.GatewayVpcEndpoint(
      this, 'S3VPCEndpoint', {
        service: ec2.GatewayVpcEndpointAwsService.S3,
        vpc: this.vpc,
        subnets: [{subnets: [privateSubnet]}],
      });

    // Add policy to access S3 and get objects
    vpce.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        effect: iam.Effect.ALLOW,
        principals: [new iam.AnyPrincipal()],
        resources: [`arn:aws:s3:::${CONSTANTS.WebsiteBucketName}/*`],
      })
    );

    // Define VPCE ID to be used in S3 bucket policy
    (this.vpceId as string) = vpce.vpcEndpointId;

    // Remove VPCE upon stack destruction
    vpce.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
