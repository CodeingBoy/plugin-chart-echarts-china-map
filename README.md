## @superset-ui/plugin-chart-echarts-china-map

[![Version](https://img.shields.io/npm/v/@superset-ui/plugin-chart-echarts-china-map.svg?style=flat-square)](https://www.npmjs.com/package/@superset-ui/plugin-chart-echarts-china-map)

This plugin provides Echarts China Map for Superset.

### Usage

Configure `key`, which can be any `string`, and register the plugin. This `key` will be used to lookup this chart throughout the app.

```js
import EchartsChinaMapChartPlugin from '@superset-ui/plugin-chart-echarts-china-map';

new EchartsChinaMapChartPlugin()
  .configure({ key: 'echarts-china-map' })
  .register();
```

Then use it via `SuperChart`. See [storybook](https://apache-superset.github.io/superset-ui/?selectedKind=plugin-chart-echarts-china-map) for more details.

```js
<SuperChart
  chartType="echarts-china-map"
  width={600}
  height={600}
  formData={...}
  queriesData={[{
    data: {...},
  }]}
/>
```

### File structure generated

```
├── package.json
├── README.md
├── tsconfig.json
├── src
│   ├── EchartsChinaMap.tsx
│   ├── images
│   │   └── thumbnail.png
│   ├── index.ts
│   ├── plugin
│   │   ├── buildQuery.ts
│   │   ├── controlPanel.ts
│   │   ├── index.ts
│   │   └── transformProps.ts
│   └── types.ts
├── test
│   └── index.test.ts
└── types
    └── external.d.ts
```
