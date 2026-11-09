import {database} from './database';

export type PrintConfig = {
  schoolName: string;
  department: string;
  parentOrg: string;
  principalName: string;
  clerkName: string;
};

export const defaultPrintConfig: PrintConfig = {
  schoolName: 'TRƯỜNG HỌC',
  department: 'VĂN PHÒNG NHÀ TRƯỜNG',
  parentOrg: '',
  principalName: '',
  clerkName: '',
};

export async function getPrintConfig(): Promise<PrintConfig> {
  try {
    const row = await database().prepare("SELECT value FROM app_settings WHERE key='print_config'").first<{value: string}>();
    if (!row?.value) return defaultPrintConfig;
    const parsed = JSON.parse(row.value) as Partial<PrintConfig>;
    return {
      schoolName: (parsed.schoolName || defaultPrintConfig.schoolName).trim(),
      department: (parsed.department || defaultPrintConfig.department).trim(),
      parentOrg: (parsed.parentOrg || '').trim(),
      principalName: (parsed.principalName || '').trim(),
      clerkName: (parsed.clerkName || '').trim(),
    };
  } catch {
    return defaultPrintConfig;
  }
}

export async function savePrintConfig(config: Partial<PrintConfig>): Promise<PrintConfig> {
  const current = await getPrintConfig();
  const updated: PrintConfig = {
    schoolName: (config.schoolName ?? current.schoolName).trim().slice(0, 150) || defaultPrintConfig.schoolName,
    department: (config.department ?? current.department).trim().slice(0, 150) || defaultPrintConfig.department,
    parentOrg: (config.parentOrg ?? current.parentOrg).trim().slice(0, 150),
    principalName: (config.principalName ?? current.principalName).trim().slice(0, 100),
    clerkName: (config.clerkName ?? current.clerkName).trim().slice(0, 100),
  };
  await database().prepare(
    "INSERT INTO app_settings(key, value) VALUES ('print_config', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).bind(JSON.stringify(updated)).run();
  return updated;
}
