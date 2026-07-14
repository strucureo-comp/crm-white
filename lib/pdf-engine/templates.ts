import { PdfTemplateStyle } from './types';
import { hexToRgb } from './helpers';

export interface PdfTemplateColors {
  primary: [number, number, number];
  primaryLight: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
  text: [number, number, number];
  textLight: [number, number, number];
  background: [number, number, number];
  tableHead: [number, number, number];
  tableHeadText: [number, number, number];
  tableBorder: [number, number, number];
  tableAlt: [number, number, number];
  footer: [number, number, number];
  headerBg?: [number, number, number];
  headerText?: [number, number, number];
}

export interface PdfTemplateConfig {
  name: string;
  colors: PdfTemplateColors;
  headerStyle: 'filled' | 'line' | 'minimal';
  tableStyle: 'grid' | 'striped' | 'clean';
  titleFontSize: number;
  bodyFontSize: number;
  smallFontSize: number;
  logoHeight: number;
  spacing: number;
}

const defaults = {
  text: [51, 51, 51] as [number, number, number],
  textLight: [102, 102, 102] as [number, number, number],
  background: [255, 255, 255] as [number, number, number],
  tableHeadText: [255, 255, 255] as [number, number, number],
  tableBorder: [220, 220, 220] as [number, number, number],
  footer: [128, 128, 128] as [number, number, number],
};

export function getTemplateConfig(style: PdfTemplateStyle, primaryHex: string): PdfTemplateConfig {
  const p = hexToRgb(primaryHex);
  const lighten = (c: [number, number, number]): [number, number, number] => [
    Math.min(255, c[0] + 60),
    Math.min(255, c[1] + 60),
    Math.min(255, c[2] + 60),
  ];
  const darken = (c: [number, number, number]): [number, number, number] => [
    Math.max(0, c[0] - 40),
    Math.max(0, c[1] - 40),
    Math.max(0, c[2] - 40),
  ];

  if (style === 'corporate') {
    return {
      name: 'Corporate',
      colors: {
        primary: p,
        primaryLight: lighten(p),
        secondary: darken(p),
        accent: [212, 175, 55],
        ...defaults,
        tableHead: p,
        tableAlt: [247, 248, 250],
        headerBg: p,
        headerText: [255, 255, 255],
      },
      headerStyle: 'filled',
      tableStyle: 'grid',
      titleFontSize: 22,
      bodyFontSize: 9,
      smallFontSize: 8,
      logoHeight: 30,
      spacing: 5,
    };
  }

  if (style === 'minimal') {
    return {
      name: 'Minimal',
      colors: {
        primary: p,
        primaryLight: lighten(p),
        secondary: darken(p),
        accent: [100, 100, 100],
        ...defaults,
        tableHead: [245, 245, 245],
        tableHeadText: [51, 51, 51],
        tableAlt: [250, 250, 250],
        headerBg: [255, 255, 255],
        headerText: p,
      },
      headerStyle: 'minimal',
      tableStyle: 'clean',
      titleFontSize: 20,
      bodyFontSize: 9,
      smallFontSize: 7.5,
      logoHeight: 28,
      spacing: 4,
    };
  }

  return {
    name: 'Modern',
    colors: {
      primary: p,
      primaryLight: lighten(p),
      secondary: darken(p),
      accent: [245, 158, 11],
      ...defaults,
      tableHead: p,
      tableAlt: [246, 249, 252],
      headerBg: [255, 255, 255],
      headerText: p,
    },
    headerStyle: 'line',
    tableStyle: 'striped',
    titleFontSize: 24,
    bodyFontSize: 9,
    smallFontSize: 8,
    logoHeight: 32,
    spacing: 5,
  };
}
