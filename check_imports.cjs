const lucide = require('lucide-react');
const iconNames = ['ServerCrash', 'ScanFace', 'Shield', 'Lock', 'AlertTriangle', 'Key', 'ShieldAlert', 'MonitorPlay', 'Activity', 'Fingerprint', 'EyeOff', 'RadioReceiver', 'Network', 'Database', 'Cpu', 'Skull', 'Power', 'RefreshCw', 'Crosshair', 'Globe', 'Ban'];
iconNames.forEach(name => {
  if (!lucide[name]) console.log('ERROR: missing from lucide-react:', name);
})
