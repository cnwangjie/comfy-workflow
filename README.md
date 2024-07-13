# comfy-workflow

A simple ComfyUI API format workflow abstraction utility for easily creating and managing workflows programmatically.

### Installation

```bash
npm install comfy-workflow
```

### Usage

```typescript
import { Workflow } from 'comfy-workflow'

const w = new Workflow()

const ipAdapterLoader = w.node('IPAdapterUnifiedLoader').setInputs({
  preset: 'PLUS FACE (portraits)',
  model: w
    .node('CheckpointLoaderSimple')
    .setInput('model_id', '1709400693561386681'),
})

w.node('KSampler').setInputs({
  seed: 579364958425023,
  steps: 25,
  cfg: 6,
  sampler_name: 'euler',
  scheduler: 'karras',
  denoise: 1,
  model: w.node('IPAdapterAdvanced').setInputs({
    weight: 1,
    weight_type: 'style transfer',
    combine_embeds: 'concat',
    start_at: 0,
    end_at: 1,
    embeds_scaling: 'V only',
    model: ipAdapterLoader.output(0),
    ipadapter: ipAdapterLoader.output(1),
    image: w.node('ImageBatchMultiple+').setInputs({
      method: 'lanczos',
      image_1: w
        .node('LoadImage')
        .setInput('media_id', '470497476971282181')
        .output(0),
      image_2: w
        .node('LoadImage')
        .setInput('media_id', '470497571755811507')
        .output(0),
    }),
  }),
})

console.log(w.toApiFormat())
```
