const GT511C3 = require('gt511c3');

const fps = new GT511C3('/dev/ttyS0');

const LED_OFF = 0x00,
      LED_ON = 0x01,
      NOT_BEST_IMAGE = 0x00,
      BEST_IMAGE = 0x01;

var buffer;

const blinkDelay = () => new Promise((resolve, reject) => setTimeout(resolve, 500));

const errorHandler = (errorCode) => {
  //try optimistic turning led off and close connction
  fps.ledONOFF(LED_OFF).then(() => fps.close());

  const error = fps.decodeError(errorCode);
  if (error === '1:1 verification failure') {
    throw new Error('Not authenticated');
  } else {
    throw new Error('Unknown error: ', errorCode, error);
  }
};


const enrollFingerAndRetrieveTemplate = () => (
  fps.init()
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
    .then(() => blinkDelay())
    .then(() => fps.ledONOFF(LED_ON))
    .then(() => fps.ledONOFF(LED_OFF))
    .then(() => fps.close())
    .catch(errorHandler)
);

module.exports = {
  enrollFingerAndRetrieveTemplate,
  setFingerprintTemplateAndVerify
};

