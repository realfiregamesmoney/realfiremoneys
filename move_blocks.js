const fs = require('fs');

const text = fs.readFileSync('src/components/admin/AdminSecurity.tsx', 'utf8');

// The marker for CENTRAL DE MONITORAMENTO
const markerStart = '{/* CENTRAL DE MONITORAMENTO */}';
const gridStartMarker = '<div className="grid grid-cols-1 md:grid-cols-2 gap-6">';

const startIndex = text.indexOf(markerStart);
const endIndex = text.indexOf(gridStartMarker);

if(startIndex > -1 && endIndex > -1) {
    const blocksToMove = text.substring(startIndex, endIndex);
    
    // remove blocks
    let newText = text.substring(0, startIndex) + text.substring(endIndex);
    
    // We want to insert it after the end of grid container.
    // The grid container ends right before </div></div>\n)
    const endNav = newText.indexOf('        </div>\n    );\n}');
    
    if (endNav > -1) {
        newText = newText.substring(0, endNav) + 
                  "            " + blocksToMove + "\n" +
                  newText.substring(endNav);
                  
        fs.writeFileSync('src/components/admin/AdminSecurity.tsx', newText);
        console.log("Moved successfully.");
    } else {
        console.log("Couldn't find insertion point.");
    }
} else {
    console.log("Couldn't find the markers.");
}
