/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, {PureComponent} from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {ECharts} from 'echarts';
// @ts-ignore
import * as cn from 'china-region';
import {
  EchartsChinaMapDataRecord,
  EchartsChinaMapDataRecordPrefixed,
  EchartsChinaMapProps,
  EchartsChinaMapState
} from './types';
import {t} from "@superset-ui/core";
import _ from 'lodash';

export default class EchartsChinaMap extends PureComponent<EchartsChinaMapProps, EchartsChinaMapState> {

  ADCODE_LENGTH = 6;

  GLOBAL_CHINA_ADCODE = 100000;

  constructor(props: EchartsChinaMapProps, context: any) {
    super(props, context);

    const initialPrefix = this.calcMostCommonPrefix(props.data);
    const initialAdcode = this.getAdcodeFromPrefix(initialPrefix);
    this.state = {
      echartRef: undefined,
      chartOption: {},
      isLoading: false,
      currentPrefix: initialPrefix,
      currentAdcode: initialAdcode,
      metricName: '',
    };
  }

  // event handlers
  onEvents = {
    click: (params: { data: any }) => {
      // handle click event
      const {data} = params;
      if (!data) {
        console.log('No data here');
        return;
      }

      const {prefix} = data;
      if (!prefix || prefix.length >= this.ADCODE_LENGTH) {
        console.log('No more lower prefix');
        return;
      }

      this.updatePrefix(prefix);
    },
  };

  calcMostCommonPrefix(data: EchartsChinaMapDataRecord[]) {
    // calculate the most common adcode prefix of data

    const adcodes = data.map((d: { adcode: any }) => d.adcode);

    function getPrefix(length: number): string {
      if (length <= 0) {
        // no prefix
        return '';
      }

      const prefixes = adcodes.map(c => c.substring(0, length));
      // are they have all the same prefix?
      const prefixSet = new Set(prefixes);
      if (prefixSet.size === 1) {
        return prefixSet.values().next().value;
      }

      // if not, try more common one
      return getPrefix(length - 2);
    }

    // starts with full one
    return getPrefix(this.ADCODE_LENGTH);
  }

  getAdcodePrefix(code: string, prefixLength: number): string {
    return code.substring(0, prefixLength).padEnd(this.ADCODE_LENGTH, '0');
  }

  aggregateData(prefix: string, data: EchartsChinaMapDataRecord[]) {
    // filter data having prefix
    const filteredData = data.filter(d => d.adcode.startsWith(prefix));

    const result: Record<string, EchartsChinaMapDataRecordPrefixed> = {};
    const nextLevelPrefixLength = prefix.length + 2;
    if (nextLevelPrefixLength <= 4) {
      // do aggregate
      const groupedData = _.groupBy(filteredData,
          d => this.getAdcodePrefix(d.adcode, nextLevelPrefixLength));
      Object.entries(groupedData).forEach(([key, keyedData]) => {
        const values = keyedData.map(d => d.value);

        const aggregatedValue = values.reduce((a, b) => a + b);
        result[key] = {
          adcode: key,
          prefix: key,
          value: aggregatedValue,
        } as EchartsChinaMapDataRecordPrefixed;
      })
    } else {
      filteredData.forEach(d => {
        result[d.adcode] = {
          adcode: d.adcode,
          prefix: d.adcode,
          value: d.value,
        } as EchartsChinaMapDataRecordPrefixed;
      });
    }

    return Object.entries(result)
        .map(([k, v]) => {
          const {name} = cn.info(k);
          v.name = name;
          v.prefix = v.adcode.substring(0, prefix.length + 2);
          return v
        });
  }

  async fetchGeoJson(adcode: string) {
    const r = await fetch(
        `https://geo.datav.aliyun.com/areas_v3/bound/geojson?code=${adcode}_full`,
    );
    return r.json();
  }

  getEChartInstance() {
    // @ts-ignore
    return this.state.echartRef.getEchartsInstance();
  }

  async loadGeoJson(adcode: string) {
    console.log('Loading geojson for ', adcode);
    const geoJson = await this.fetchGeoJson(adcode);
    echarts.registerMap(adcode, geoJson);
    console.log(`Registered geo ${adcode}`);
  }

  updatePrefix = (prefix: string) => {
    const adcode = this.getAdcodeFromPrefix(prefix);
    console.log('Switch to adcode', adcode);

    this.setState({
      currentPrefix: prefix,
      currentAdcode: adcode,
    })

    const prefixedData = this.aggregateData(prefix, this.props.data);
    console.log('Prefix aggregated data: ', prefixedData);

    const values = prefixedData.map(d => d.value);
    const dataMin = values.length === 1 ? 0 : values.reduce((a, b) => Math.min(a, b));
    const dataMax = values.reduce((a, b) => Math.max(a, b));

    this.loadGeoJson(adcode).then(() => {
      this.showLoading();
      this.getEChartInstance().clear();
      this.setState(
          {
            chartOption: {
              tooltip: {},
              series: [
                {
                  id: 0,
                  type: 'map',
                  name: this.props.metricName,
                  map: adcode,
                  roam: true,
                  label: {
                    show: true,
                  },
                  data: prefixedData,
                },
              ],
              visualMap: {
                type: 'continuous',
                min: dataMin,
                max: dataMax,
                text: [t('High'), t('Low')],
                realtime: true,
                calculable: true,
                inRange: {
                  color: ['lightskyblue', 'yellow', 'orangered'],
                },
              },
            },
          },
          () => {
            this.hideLoading();
          },
      );
    });
  }

  getAdcodeFromPrefix(prefix: string): string {
    if (prefix === '') {
      return String(this.GLOBAL_CHINA_ADCODE);
    }
    if (prefix.length > 4) {
      prefix = prefix.substring(0, 4);
    }

    return prefix.padEnd(this.ADCODE_LENGTH, '0');
  }

  showLoading() {
    this.setState({
      isLoading: true,
    });
  }

  hideLoading() {
    this.setState({
      isLoading: false,
    });
  }

  getPreviousPrefix() {
    const currentPrefix = this.state.currentPrefix;
    if (currentPrefix === '') {
      return null;
    }

    return currentPrefix.substring(0, currentPrefix.length - 2);
  }

  onChartReadyCallback = (echart: ECharts) => {
    const outerThis = this;
    echart.getZr().on('click', function (event) {
      if (!event.target) {
        const newPrefix = outerThis.getPreviousPrefix();
        if (newPrefix === null) {
          console.log('No more upper prefix, current prefix ', outerThis.state.currentPrefix);
          return;
        }

        console.log(
            `User clicked outer space, prefix changed: ${outerThis.state.currentPrefix} -> ${newPrefix}`,
        );

        outerThis.updatePrefix(newPrefix);
      }
    });
    this.updatePrefix(this.state.currentPrefix);
  };

  render() {
    const {height, width} = this.props;

    return (
        <ReactECharts
            option={this.state.chartOption}
            showLoading={this.state.isLoading}
            style={{height, width}}
            onEvents={this.onEvents}
            onChartReady={this.onChartReadyCallback}
            ref={e => {
              // @ts-ignore
              this.setState({echartRef: e});
            }}
        />
    );
  }
}
