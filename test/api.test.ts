import { Workflow } from '../src'

const seed = 0
const steps = 25
const width = 512
const height = 512
const batchSize = 1
const modelId = '1709400693561386681'
const prompts = 'anime, cute'

const v1 = {
  sampler: {
    inputs: {
      seed,
      steps,
      cfg: 6,
      sampler_name: 'euler',
      scheduler: 'karras',
      denoise: 1,
      model: ['model', 0],
      positive: ['general_positive', 0],
      negative: ['general_negative', 0],
      latent_image: ['latent_image', 0],
    },
    class_type: 'KSampler',
    _meta: {
      title: 'KSampler',
    },
  },
  latent_image: {
    inputs: {
      width: width,
      height: height,
      batch_size: batchSize,
    },
    class_type: 'EmptyLatentImage',
    _meta: {
      title: 'Empty Latent Image',
    },
  },
  model: {
    inputs: {
      ckpt_name: 'aa',
      model_id: modelId,
    },
    class_type: 'CheckpointLoaderSimple',
    _meta: {
      title: 'Load Checkpoint',
    },
  },
  general_positive: {
    inputs: {
      text: '4k, high quality, anime style, ' + prompts,
      clip: ['10', 0],
    },
    class_type: 'CLIPTextEncode',
    _meta: {
      title: 'CLIP Text Encode (Prompt)',
    },
  },
  general_negative: {
    inputs: {
      text: 'lowres, 3d, 3D, (bad), multiple_girls, text, error, fewer, extra, missing, worst quality, jpeg artifacts, low quality, watermark, unfinished, displeasing, oldest, early, chromatic aberration, signature, extra digits, artistic error, username, scan, 2girls',
      clip: ['10', 0],
    },
    class_type: 'CLIPTextEncode',
    _meta: {
      title: 'CLIP Text Encode (Prompt)',
    },
  },
  '5': {
    inputs: {
      samples: ['sampler', 0],
      vae: ['model', 2],
    },
    class_type: 'VAEDecode',
    _meta: {
      title: 'VAE Decode',
    },
  },
  '6': {
    inputs: {
      filename_prefix: 'ComfyUI',
      images: ['5', 0],
    },
    class_type: 'SaveImage',
    _meta: {
      title: 'Save Image',
    },
  },
  '10': {
    inputs: {
      stop_at_clip_layer: -2,
      clip: ['model', 1],
    },
    class_type: 'CLIPSetLastLayer',
    _meta: {
      title: 'CLIP Set Last Layer',
    },
  },
}

const v2 = {
  ipa: {
    inputs: {
      weight: 1,
      weight_type: 'style transfer',
      combine_embeds: 'concat',
      start_at: 0,
      end_at: 1,
      embeds_scaling: 'V only',
      model: ['ipa_loader', 0],
      ipadapter: ['ipa_loader', 1],
      image: ['image_input', 0],
    },
    class_type: 'IPAdapterAdvanced',
    _meta: {
      title: 'IPAdapter Advanced',
    },
  },
  ipa_loader: {
    inputs: {
      preset: 'PLUS FACE (portraits)',
      download1: {
        type: 'custom_model',
        file_id: '1709397518130933621',
        dir: 'models/clip_vision',
      },
      download2: {
        type: 'custom_model',
        file_id: '1709397518130933622',
        dir: 'models/ipadapter',
      },
      model: ['model', 0],
    },
    class_type: 'IPAdapterUnifiedLoader',
    _meta: {
      title: 'IPAdapter Unified Loader',
    },
  },
  ipa_tagger: {
    inputs: {
      model: 'wd-v1-4-moat-tagger-v2',
      threshold: 0.35,
      character_threshold: 0.85,
      replace_underscore: false,
      trailing_comma: false,
      exclude_tags: 'looking_at_viewer, arm_up, open_mouth, full_body',
    },
    class_type: 'WD14Tagger|pysssss',
    _meta: {
      title: 'WD14 Tagger 🐍',
    },
  },
  ipa_positive: {
    inputs: {
      text: ['ipa_positive_text', 0],
      clip: ['10', 0],
    },
    class_type: 'CLIPTextEncode',
    _meta: {
      title: 'CLIP Text Encode (Prompt)',
    },
  },
  ipa_positive_text: {
    inputs: {
      string1: ['57', 0],
      string2: ['ipa_tagger', 0],
      delimiter: ',',
    },
    class_type: 'JoinStrings',
    _meta: {
      title: 'Join Strings',
    },
  },
  '57': {
    inputs: {
      string: '4k, high quality, anime style, ' + prompts,
    },
    class_type: 'StringConstant',
    _meta: {
      title: 'String Constant',
    },
  },
}

describe('a', () => {
  const w = new Workflow()
  let v1w: Workflow

  it('should load graph correctly', () => {
    v1w = Workflow.fromApiFormat(v1)
    expect(v1w.toApiFormat()).toEqual(v1)
  })

  it('should merge graph correctly', () => {
    expect(w.merge(v1w).toApiFormat()).toEqual(v1)
  })

  it('should detect non-existent node', () => {
    expect(() => {
      w.mergeApiFormat(v2)
    }).throws(/node ".*" not found/)
  })

  it('should add node correctly', () => {
    w.node('LoadImage', 'image_input').setInputs({
      media_id: '470497476971282181',
    })
  })

  it('should merge graph correctly', () => {
    w.mergeApiFormat(v2)
  })
})
