const path = require('path');
const Nonin3230 = require('nonin-3230-ble');
const awsIot = require('aws-iot-device-sdk');
const { enrollAndRetrieveTemplate, setTemplateAndVerify } = require('./fingerprint');

const device = awsIot.device({
  keyPath: path.join(__dirname, 'certs/647f7ac5d9-private.pem.key'),
  certPath: path.join(__dirname, 'certs/647f7ac5d9-certificate.pem.crt'),
  caPath: path.join(__dirname, 'certs/VeriSign-Class 3-Public-Primary-Certification-Authority-G5.pem'),
  clientId: 'macbook-air',
  region: 'eu-central-1'
});

device
  .on('connect', () => {
    device.subscribe('oximetry');
  })
  .on('error', (err) => console.log('error', err))
  .on('message', (topic, payload) => console.log('message', topic, payload.toString()));

Nonin3230.discover((pulseOximeter) => {
  pulseOximeter.connectAndSetup((error) => {
    if (error) {
      console.error(error);
    }

    pulseOximeter.on('data', (data) => {
      device.publish('oximetry', JSON.stringify(data));
    });
  });
});

setTimeout(() => setTemplateAndVerify().then(() => console.log('usccesss')), 1000);
