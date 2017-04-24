const GT511C3 = require('gt511c3');
const { delay } = require('../utils');
const logger = require('../logger');

const fps = new GT511C3('/dev/ttyS0');

const LED_OFF = 0x00,
      LED_ON = 0x01,
      NOT_BEST_IMAGE = 0x00,
      BEST_IMAGE = 0x01;

var buffer;

const errorHandler = (errorCode) => {
  //try optimistic turning led off and close connction
  fps.ledONOFF(LED_OFF).then(() => fps.close());

  const error = fps.decodeError(errorCode);
  logger.log('debug', 'Error handler', errorCode, error);

  if (error === '1:1 verification failure') {
    throw new Error('Not authenticated');
  } else {
    throw new Error('Unknown error: ', errorCode, error);
  }
};


const enrollFingerAndRetrieveTemplate = () => (
  fps.init()
    .then(() => fps.deleteID(0))
    .catch((error) => {
      const errCode = fps.decodeError(error);
      logger.log('debug', 'Enroll finger', error, errCode);
      if (errCode === 'the database is empty'
          || errCode === 'the specified ID is not between 0-199') {
        return Promise.resolve();
      }
      return Promise.reject();
    })
    .then(() => fps.enroll(0))
    .then(() => fps.getTemplate(0))
    .then((template) => {
      buffer = template; //upload template to aws
      return fps.close();
    })
    .catch(errorHandler)
);

const setFingerprintTemplateAndVerify = (template) => ( //retrieve template from aws
  fps.init()
    //.then(() => fps.setTemplate(0, template || buffer))
    .then(() => fps.ledONOFF(LED_ON))
    .then(() => fps.waitFinger(10000))
    .then(() => fps.captureFinger(NOT_BEST_IMAGE))
    .then(() => fps.verify(0))
    .then(() => fps.ledONOFF(LED_OFF))
    .then(() => delay())
    .then(() => fps.ledONOFF(LED_ON))
    .then(() => fps.ledONOFF(LED_OFF))
    .then(() => fps.close())
    .catch(errorHandler)
);

const blinkingFingerprintLed = (duration = 20000) => {
    fps.init()
      .then(() => {
        let on = true;
        let timer = setInterval(() => {
          console.log('invoked');
          if (on) {
            on = false;
            fps.ledONOFF(LED_ON);
          }
          else {
            on = true;
            fps.ledONOFF(LED_OFF);
          }
        }, 1000);
        setTimeout(() => {
          clearInterval(timer);
          fps.ledONOFF(LED_OFF).then(() => fps.close());
        }, duration);
      }).catch(errorHandler);
};

module.exports = {
  enrollFingerAndRetrieveTemplate,
  setFingerprintTemplateAndVerify,
  blinkingFingerprintLed
};

