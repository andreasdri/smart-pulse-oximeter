const path = require('path');
const PulseOximeter = require('nonin-3230-ble');
const awsIot = require('aws-iot-device-sdk');
const { enrollFingerAndRetrieveTemplate, setFingerprintTemplateAndVerify }
  = require('./fingerprint');

const NUMBER_OF_SENSOR_READINGS = 15;

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


setFingerprintTemplateAndVerify()
  .then(() => {
    let timer;

    const onDiscover = ((pulseOximeter) => {
      pulseOximeter.connectAndSetup((error) => {
        if (error) {
          console.error(error);
        }
      });

      let counter = 0;
      pulseOximeter
        .on('data', (data) => {
          counter += 1;
          device.publish('oximetry', JSON.stringify(data));
          if (counter === NUMBER_OF_SENSOR_READINGS) {
            clearTimeout(timer);
            pulseOximeter.disconnect();
          }
        })
        .on('disconnect', () => clearTimeout(timer));

    });

    PulseOximeter.discover(onDiscover);

    timer = setTimeout(() => {
      PulseOximeter.stopDiscover(onDiscover);
    }, 30000);

  }, (error) => console.log(error));
