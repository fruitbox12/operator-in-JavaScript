import * as k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApiCustom = kc.makeApiClient(k8s.CustomObjectsApi);
const watch = new k8s.Watch(kc);

// Define the Fireline interfaces
interface FirelineSpec {
  stages: string[];
}

interface StageDetail {
  stageName: string;
  startTime: string;
  endTime?: string;
  status: string; // 'InProgress', 'Completed', 'Failed'
}

interface FirelineStatus {
  currentStage: string;
  stageDetails: StageDetail[];
}

interface Fireline {
  apiVersion: string;
  kind: string;
  metadata: k8s.V1ObjectMeta;
  spec: FirelineSpec;
  status?: FirelineStatus;
}

// Function to watch Fireline resources
async function watchFirelineResource(): Promise<string> {
  try {
    await watch.watch(
      '/apis/tekton.dev/v1/namespaces/default/firelines',
      {},
      onFirelineEvent,
      () => watchFirelineResource()
    );
    return 'Started watching Fireline resources.';
  } catch (err) {
    return `Error watching Fireline resources: ${err}`;
  }
}

// Function to handle Fireline events
async function onFirelineEvent(phase: string, apiObj: any): Promise<string> {
  const fireline: Fireline = apiObj;
  if (phase === 'ADDED' || phase === 'MODIFIED') {
    return await reconcileFireline(fireline);
  } else if (phase === 'DELETED') {
    // Handle deletion if necessary
    return `Fireline resource deleted: ${fireline.metadata.name}`;
  }
  return `Unhandled event phase: ${phase} for Fireline: ${fireline.metadata.name}`;
}

// Function to reconcile Fireline resources
// Function to reconcile Fireline resources
async function reconcileFireline(fireline: Fireline): Promise<string> {
  // Example logic to determine the current stage and update stage details
  // This should be replaced with your actual logic
  if (!fireline.metadata || !fireline.metadata.name) {
    return 'Error: Fireline resource name is undefined';
  }
  let currentStage = 'Unknown';
  const stageDetails: StageDetail[] = [];

  if (fireline.spec && fireline.spec.stages) {
    // Example logic to set the current stage based on some conditions
    // Replace this with your actual stage determination logic
    currentStage = fireline.spec.stages[0]; // Placeholder for actual logic

    // Populate stageDetails based on the current stage
    // This is just an example and should be replaced with actual logic
    stageDetails.push({
      stageName: currentStage,
      startTime: new Date().toISOString(),
      status: 'InProgress', // Example status, update as per your logic
    });
  }

  const updatedStatus: FirelineStatus = {
    currentStage: currentStage,
    stageDetails: stageDetails,
  };

  try {
    await k8sApiCustom.replaceNamespacedCustomObjectStatus(
      'tekton.dev',
      'v1',
      'default', // Replace with appropriate namespace if needed
      'firelines',
      fireline.metadata.name,
      { status: updatedStatus }
    );
    return `Fireline resource reconciled: ${fireline.metadata.name}`;
  } catch (err) {
    return `Error reconciling Fireline resource: ${err}`;
  }
}


 

// Main function
async function main() {
  const message = await watchFirelineResource();
  console.log(message);
}

main();
