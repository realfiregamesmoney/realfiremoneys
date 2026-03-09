const iconNames = ['ServerCrash', 'ScanFace', 'Shield', 'Lock', 'AlertTriangle', 'Key', 'ShieldAlert', 'MonitorPlay', 'Activity', 'Fingerprint', 'EyeOff', 'RadioReceiver', 'Network', 'Database', 'Cpu', 'Skull', 'Power', 'RefreshCw', 'Crosshair', 'Globe', 'Ban'];
const lucide = require('lucide-react');
iconNames.forEach(name => {
  if (!lucide[name]) console.log('ERROR: missing from lucide-react:', name);
})
