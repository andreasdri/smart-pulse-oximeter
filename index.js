const PulseOximeter = require('nonin-3230-ble');
const awsIot = require('aws-iot-device-sdk');
const { Button, RGBLed } = require('pigpio-components');
const { enrollFingerAndRetrieveTemplate, setFingerprintTemplateAndVerify,
  blinkingFingerprintLed } = require('./fingerprint');
const { awsConfig } = require('./config.js');
const { delay } = require('./utils.js');

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

/*
setTimeout(() => {
  blinkingFingerprintLed(10000);
  leftLed.rainbow();
  rightLed.rainbow();
  setTimeout(() => {
    leftLed.stop().color('blue').on();
    rightLed.stop().color('blue').on();
  }, 10000);
}, 7000);
*/


const showErrorLeds = () => {
  leftLed.stop().color('red').on();
  rightLed.stop().color('red').on();
  delay(4000).then(() => {
    rightLed.stop().color('blue').on();
    leftLed.stop().color('blue').on();
  });
};

const startMeasurement = () => {
  rightLed.color('blue').strobe();
  setFingerprintTemplateAndVerify()
    .then(() => {
      rightLed.stop().color('green').on();
      leftLed.color('blue').strobe();
      let timer;

      const onDiscover = ((pulseOximeter) => {
        leftLed.color('green').strobe();
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
              rightLed.color('blue').on();
              clearTimeout(timer);
              pulseOximeter.disconnect();
            }
          })
          .on('disconnect', () => {
            if (counter < NUMBER_OF_SENSOR_READINGS) {
              showErrorLeds();
              clearTimeout(timer);
            }
          });

      });

      PulseOximeter.discover(onDiscover);

      timer = setTimeout(() => {
        showErrorLeds();
        PulseOximeter.stopDiscover(onDiscover);
      }, 30000);

    },
    (error) => showErrorLeds());
};

button.on('click', () => {
  startMeasurement();
});

if (process.env.NODE_ENV === "development") {
  button.on('long press', () => {
    rightLed.color('blue').strobe();
    enrollFingerAndRetrieveTemplate()
      .then(() => {
        rightLed.stop().color('green').on();
        delay(4000).then(() => rightLed.color('blue').on());
      }, (error) => showErrorLeds());
  });
}

