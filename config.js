const path = require('path');

exports.awsConfig = {
  keyPath: path.join(__dirname, 'certs/647f7ac5d9-private.pem.key'),
  certPath: path.join(__dirname, 'certs/647f7ac5d9-certificate.pem.crt'),
  caPath: path.join(__dirname, 'certs/VeriSign-Class 3-Public-Primary-Certification-Authority-G5.pem'),
  clientId: 'macbook-air',
  region: 'eu-central-1'
};

