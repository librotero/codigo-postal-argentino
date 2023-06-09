const puppeteer = require("puppeteer");
const fs = require("fs");
const stateCode = require("../db/stateCode.json")


function obtenerLetraPorProvincia(provincia) {
  var result = stateCode.find((objeto) => objeto.provincia.toUpperCase() === provincia.toUpperCase())
if (result) {
  return result.letra
} else {
  return null
}
}
const extractStateFromResponse = async (url) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const pElement = await page.$x("/html/body/div[3]/div/div[2]/div[1]/p");

    var fragmento = {
      state: "",
      name: "",
      zip: "",
      district: "",
      type: "",
      reference: "",
      alternativeName: "",
      neighborhood: "",
      isOdd: "",
      from: "",
      until: "",
    };
    if (pElement.length > 0) {
      const pText = await page.evaluate(
        (element) => element.textContent,
        pElement[0]
      );

      const calleRegex = /pertenece a(.*?)a todos los números/;
      const provinciaRegex = /provincia(.*?)Argentina/;
      const ubicacionRegex = /en\s(.*?),/;
      const numerosRegex = /números ([\d]+) a ([\d]+)/;
      const cpaRegex = /CPA ([^\s,]+)/;

      const calleMatch = pText.match(calleRegex);
      const provinciaMatch = pText.match(provinciaRegex);
      const ubicacionMatch = pText.match(ubicacionRegex);
      const numerosMatch = pText.match(numerosRegex);
      const cpaMatch = pText.match(cpaRegex);
      const cpa = cpaMatch ? cpaMatch[1] : null;
     
      //calle
      if (calleMatch) {
        calle = calleMatch[1].trim();
      } else {
        calle=null;
      }
      //provincia
      if (provinciaMatch) {
        provincia = provinciaMatch[1].trim();
      } else {
        provincia=null
      }
      //ubicacion
      if (ubicacionMatch) {
        ubicacion = ubicacionMatch[1].trim();
      } else {
        ubicacion==null
      }
      const numerosInicio = numerosMatch ? parseInt(numerosMatch[1]) : null;
      const numerosFin = numerosMatch ? parseInt(numerosMatch[2]) : null;
      const numerosTipo =
        numerosInicio && numerosFin
          ? numerosInicio % 2 === 0
            ? "pares"
            : "impares"
          : null;

      fragmento.state = provincia;
      fragmento.nameStreet = calle;
      fragmento.from = numerosInicio;
      fragmento.until = numerosFin;
      fragmento.isOdd = numerosTipo;
      fragmento.neighborhood = ubicacion;
      fragmento.name = ubicacion;
      fragmento.zip = cpa;
    } else {
      console.log("err: no encontramos referencias");
    }
    return fragmento;
  } catch (error) {
    console.error(`Error processing : ${error.message}`);
  }
  return fragmento;
};


function saveResult(state) {
  var result = {
    localities: [],
    streets: [],
    numbers: []
  };

  var localitiesID = generarID();
  var streetsID = generarID();
  var numbersID = generarID();

  result.localities.push({
    id: localitiesID,
    name: state.name,
    zip: state.zip,
    state: state.state,
  });
  result.streets.push({
    streetId: streetsID,
    name: state.nameStreet,
    localityId: localitiesID,
    neighborhood: state.name,
  });
  result.numbers.push({
    numberId: numbersID,
    streetId: streetsID,
    from: state.from,
    until: state.until,
    isOdd: state.isOdd,
  });

  var localitiesCsv = 'id,name,zip,state\n';
  result.localities.forEach(function(locality) {
    localitiesCsv += locality.id.toLowerCase() + ',' + locality.name.toLowerCase() + ',' + locality.zip.toLowerCase() + ',' + locality.state.toLowerCase() + '\n';
  });

  var streetsCsv = 'streetId,name,localityId,neighborhood\n';
  result.streets.forEach(function(street) {
    streetsCsv += street.streetId.toLowerCase() + ',' + street.name.toLowerCase() + ',' + street.localityId.toLowerCase() + ',' + street.neighborhood.toLowerCase() + '\n';
  });

  var numbersCsv = 'numberId,streetId,from,until,isOdd\n';
  result.numbers.forEach(function(number) {
    numbersCsv += number.numberId.toLowerCase() + ',' + number.streetId.toLowerCase() + ',' + number.from + ',' + number.until + ',' + number.isOdd.toLowerCase() + '\n';
  });
  
  fs.appendFileSync('db/localities.csv', localitiesCsv);
  fs.appendFileSync('db/streets.csv', streetsCsv);
  fs.appendFileSync('db/numbers.csv', numbersCsv);
  console.log('Archivos CSV actualizados correctamente.');

  return result;
}

function generarID() {
  let timestamp = new Date().getTime().toString();
  let random = Math.random().toString(36).substring(2, 10);
  let id = timestamp + random;
  return id;
}

module.exports = {
  extractStateFromResponse,
  saveResult,
  generarID,
  obtenerLetraPorProvincia,
};
