const PulseOximeter = require('nonin-3230-ble');
const awsIot = require('aws-iot-device-sdk');
const { Button, RGBLed } = require('pigpio-components');
const { enrollFingerAndRetrieveTemplate, setFingerprintTemplateAndVerify }
  = require('./fingerprint');
const { awsConfig } = require('./config.js');

const NUMBER_OF_SENSOR_READINGS = 20;

/* Noble attaches a listener that interrupts the GPIO cleanup.
 * The Noble listener does not do anything else than
 * invoking process.exit(1) if it is the last listener, */
process.removeListener('SIGINT', process.listeners('SIGINT')[0]);

const device = awsIot.device(awsConfig);
const button = new Button({ gpio: 24, isPullup: true });
const leftLed = new RGBLed({ red: 25, green: 8, blue: 7 });
const rightLed = new RGBLed({ red: 17, green: 27, blue: 22 });

device
  .on('connect', () => {
    device.subscribe('oximetry');
    leftLed.color('blue').on();
    rightLed.color('blue').on();
  })
  .on('error', (err) => console.log('error', err))
  .on('message', (topic, payload) => console.log('msg', topic, payload.toString()));


const startMeasurement = () => {
  rightLed.color('blue').strobe();
  setFingerprintTemplateAndVerify()
    .then(() => {
      rightLed.stop().color('green').on();
      leftLed.color('blue').strobe();
      let timer;

      const onDiscover = ((pulseOximeter) => {
        leftLed.stop().color('green').strobe();
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
              leftLed.stop().color('blue').on();
              rightLed.stop().color('blue').on();
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
};

button.on('click', () => {
  startMeasurement();
});

button.on('long press', () => {
  enrollFingerAndRetrieveTemplate()
    .then(() => {
      console.log('fingerprint ok');
    });
});

