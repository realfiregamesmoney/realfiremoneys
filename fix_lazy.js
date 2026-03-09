const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

if (code.includes('import AdminSecurity from "@/components/admin/AdminSecurity"')) {
    code = code.replace(
        'import AdminSecurity from "@/components/admin/AdminSecurity";',
        'import React, { Suspense, lazy } from "react";\nconst AdminSecurity = lazy(() => import("@/components/admin/AdminSecurity"));'
    );
    // remove the initial import React... if exists twice
    code = code.replace('import React, { useState, useEffect } from "react";', 'import { useState, useEffect } from "react";');
    
    code = code.replace(
        '<TabsContent value="security"><AdminSecurity /></TabsContent>',
        '<TabsContent value="security"><Suspense fallback={<div>Carregando Escudos...</div>}><AdminSecurity /></Suspense></TabsContent>'
    );
    
    fs.writeFileSync('src/pages/Admin.tsx', code);
    console.log('Fixed lazy loaded components');
}
