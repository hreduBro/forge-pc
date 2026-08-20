import { PCBuild, CompatibilityCheckResult, CompatibilityIssue, PCCategory } from '../types/pc';

export const REQUIRED_CATEGORIES: PCCategory[] = [
  'case',
  'cpu',
  'motherboard',
  'gpu',
  'cooler',
  'ram',
  'storage',
  'psu',
];

export function checkBuildCompatibility(build: PCBuild): CompatibilityCheckResult {
  const issues: CompatibilityIssue[] = [];
  const warnings: CompatibilityIssue[] = [];

  const missingRequired: PCCategory[] = REQUIRED_CATEGORIES.filter(
    (cat) => !build[cat]
  );

  // 1. CPU & Motherboard Socket Compatibility
  if (build.cpu && build.motherboard) {
    if (build.cpu.socket && build.motherboard.socket && build.cpu.socket !== build.motherboard.socket) {
      issues.push({
        type: 'socket',
        severity: 'error',
        title: 'Socket Mismatch',
        message: `The ${build.cpu.name} uses socket ${build.cpu.socket}, but the ${build.motherboard.name} has socket ${build.motherboard.socket}. These parts cannot be physically installed together.`,
        affectedCategories: ['cpu', 'motherboard'],
      });
    }
  }

  // 2. RAM & Motherboard Type
  if (build.ram && build.motherboard) {
    if (build.ram.ramType && build.motherboard.ramType && build.ram.ramType !== build.motherboard.ramType) {
      issues.push({
        type: 'ram_type',
        severity: 'error',
        title: 'RAM Type Incompatibility',
        message: `The ${build.motherboard.name} requires ${build.motherboard.ramType} memory, but the selected RAM is ${build.ram.ramType}.`,
        affectedCategories: ['ram', 'motherboard'],
      });
    }
  }

  // 3. Motherboard Form Factor & Case Form Factor
  if (build.motherboard && build.case) {
    if (build.case.formFactor === 'Mini-ITX' && build.motherboard.formFactor !== 'Mini-ITX') {
      issues.push({
        type: 'form_factor',
        severity: 'error',
        title: 'Motherboard Too Large for Case',
        message: `The ${build.case.name} is a compact Mini-ITX case and cannot fit a ${build.motherboard.formFactor} motherboard.`,
        affectedCategories: ['motherboard', 'case'],
      });
    }
  }

  // 4. Power Consumption vs PSU Wattage
  const cpuTdp = build.cpu?.tdp || 0;
  const gpuTdp = build.gpu?.tdp || 0;
  const otherTdp = (build.cooler?.tdp ? 25 : 15) + (build.fans ? 30 : 15) + 30; // mobo, ram, fans, rgb, ssd
  const totalEstimatedWattage = Math.round(cpuTdp + gpuTdp + otherTdp);

  if (build.psu) {
    const psuWattage = build.psu.wattage || 750;
    const recommendedWattage = totalEstimatedWattage * 1.25; // 25% headroom

    if (psuWattage < totalEstimatedWattage) {
      issues.push({
        type: 'wattage',
        severity: 'error',
        title: 'Insufficient Power Supply',
        message: `Estimated system draw is ~${totalEstimatedWattage}W, which exceeds the ${build.psu.name} rating of ${psuWattage}W. The PC may crash under full load.`,
        affectedCategories: ['psu', 'gpu', 'cpu'],
      });
    } else if (psuWattage < recommendedWattage) {
      warnings.push({
        type: 'wattage',
        severity: 'warning',
        title: 'Tight Power Overhead',
        message: `Your PSU (${psuWattage}W) handles the ~${totalEstimatedWattage}W load, but having at least ${Math.round(recommendedWattage)}W is recommended for transient power spikes.`,
        affectedCategories: ['psu'],
      });
    }
  }

  // 5. Cooler Capacity vs CPU TDP
  if (build.cpu && build.cooler) {
    const coolerTdp = build.cooler.tdp || 200;
    if (build.cpu.tdp && build.cpu.tdp > coolerTdp) {
      warnings.push({
        type: 'cooler_capacity',
        severity: 'warning',
        title: 'Cooler Thermal Limit Warning',
        message: `The ${build.cpu.name} can draw up to ${build.cpu.tdp}W, while the ${build.cooler.name} is rated for ~${coolerTdp}W. It may run hotter under sustained rendering tasks.`,
        affectedCategories: ['cpu', 'cooler'],
      });
    }
  }

  const isComplete = missingRequired.length === 0;
  const isCompatible = issues.length === 0;

  return {
    isCompatible,
    issues,
    warnings,
    estimatedWattage: totalEstimatedWattage,
    isComplete,
    missingRequired,
  };
}

export function calculateBuildTotal(build: PCBuild): number {
  return Object.values(build).reduce((acc, part) => {
    return acc + (part ? part.price : 0);
  }, 0);
}
