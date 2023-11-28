const jsdom = require("jsdom");
const { JSDOM } = jsdom;

JSDOM.fromFile(process.env.REPORT_FILE).then(dom => {
  const document = dom.window.document;

  function prevUntil(element, selector) {
    const elements = [];
    while(element.previousElementSibling && !element.previousElementSibling.matches(selector)) {
      element = element.previousElementSibling;
      elements.push(element);
    }
    elements.push(element.previousElementSibling);
    return elements;
  }
  
  function outputStats(variableFonts = false) {
    console.log(variableFonts ? '**Variable Fonts**' : '**Basic Features**');
    
    const testCaseTables = Array.from(document.querySelectorAll('.desc+table')).filter((table) => {
      const prev = prevUntil(table, 'h3');
      const headline = prev.pop();

      const isVariableRelated = /^.VAR/.test(headline.textContent.trim()) || prev.find(d => /variable font|axis/i.test(d.textContent));              
      
      const returnValue = (variableFonts && isVariableRelated) || (!variableFonts && !isVariableRelated);

      // if (returnValue) {
      //   console.log(headline.textContent.trim());
      // }
      
      return returnValue;
    });

    // console.log(testCaseTables);
 
    const casesCount = testCaseTables.length;
    const failingCases = testCaseTables.filter(t => t.querySelectorAll('.conformance-fail').length).length;
    const passingCases = casesCount - failingCases;
    
    const single_passing = document.querySelectorAll(".conformance-pass");
    const single_failing = document.querySelectorAll(".conformance-fail");
  
    console.log(`✔ PASS: ${passingCases}`);
    console.log(`❌ FAIL: ${failingCases}`);
  
    const blockCount = 12;
    const done = casesCount ? passingCases/casesCount : 0;
    const blocksPassing = Math.round(done*blockCount);
    const blobksFailing = 12 - blocksPassing;
  
    console.log(`${'🟩'.repeat(blocksPassing)}${'⬛'.repeat(blobksFailing)} ${(done*100).toFixed(2)}%\n\n`);
  }

  outputStats();
  outputStats(true);
});
