const express = require('express');
const router = express.Router();
const app = express();
const cors = require('cors');
const belvo = require('belvo').default;
const fs = require('fs');
const jwt = require('jsonwebtoken');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use('/api', router);

// Link id = be783360-5908-4aae-b739-9bd92ffb3a32
// cuenta id = bfe644d0-bbfb-43a1-89e0-4dac086478ae
// institucin nombre = gringotts_mx_retail
// institucion id = 1001


// client.institutions.list() // lista instituciones creadas
// client.institutions.detail(1001) // detalle de institucion
// client.links.list() //Lista usuarios creados
// client.links.register('gringotts_mx_retail', 'juanpis', '123') // crea usuarios
// client.accounts.retrieve('8954c74b-3193-4c8e-a6e0-e3d87013576f') // crear a usuario creado en una cuenta bancaria
// client.accounts.detail('bfe644d0-bbfb-43a1-89e0-4dac086478ae') //Detalle cuenta

const client = new belvo(
  '092fbf55-4f71-4b10-877d-22ea7ddaea91',
  'fDtJQYXZcxPpPG0A8_RpIuzF#GcdL9ldSPk3S*sPR7s9O0Ei0SZH5rD3n3Y*YVPh',
  'https://sandbox.belvo.com'
);

function writeLog(file, route, json) {
  const texto = (
    `
    --------------------------------------------------------------------
      Error encontrado en api (${route}):
      ${new Date}
      ${JSON.stringify(json)}
    --------------------------------------------------------------------`
  );
  fs.writeFile(file, texto, { flag: 'a+' }, err => {
    if (err) {
      return console.log(err);
    }
  });
}

router.get('/belvo/token', (req, res) => {
  const options = {
    scopes: 'read_institutions,write_links,read_links',
    widget: {
      branding: {
        company_logo: '../image/logo_company.svg',
        company_name: 'Juanpis Banks',
        company_benefit_header: 'Rapida aprobacion de prueba',
        company_benefit_content: 'Si no apruebo esta prueba al menos conociste tus deudas',
        opportunity_loss: 'Asi te vayas se que te guste :( llameme :(',
      }
    },
  };

  client
  .connect()
  .then(function () {
    client.widgetToken.create(options)
    .then(response => {
      res.json(response);
    })
    .catch(error => {
      res.status(500).send({
        message: error.message,
      });
    });
  });
});

router.post('/belvo/auth', (req, res) => {
  const token = jwt.sign(
    req.body,
    'z3FZjftGDWCr7N',
    {expiresIn: '1d'}
  );
  res.status(200).json({token})
});

router.post('/belvo/event', (req, res) => {
  if (req.body.eventName !== 'ERROR') {
    return;
  }

  writeLog('./logs/error.log', '/belvo/event', req.body.meta_data);
});

router.post('/belvo/close', (req, res) => {
  console.log(req.body);
});

router.get('/belvo/link/destroy/all', (req, res) => {
  (
    client
    .connect()
    .then(() => client.links.list())
    .then(list => {
      list.map(({id}) => {
        client
        .connect()
        .then(() => client.links.delete(id))
        .then(status => {
          console.log(status);
        })
        .catch(
          error => {
          res.status(500).send({
            message: error.message,
          });
        });
      })
    })
    .catch(
      error => {
      res.status(500).send({
        message: error.message,
      });
    })
  );
});

router.get('/belvo/link/list', (req, res) => {
  (
    client
    .connect()
    .then(() => client.links.list())
    .then(list => {
      res.json(list);
    })
    .catch(
      error => {
      res.status(500).send({
        message: error.message,
      });
    })
  );
});

router.post('/belvo/user/accounts', (req, res) => {
  const userData = jwt.decode(req.body.token);
  (
    client
    .connect()
    .then(() => client.accounts.retrieve(userData.link))
    .then(accounts => {
      const sendData = [];
      accounts.map(account => {
        const numberLenght = account.public_identification_value.length - 1;
        let numberProtected = '';
        for (
          let iteratorNumber = 0;
          iteratorNumber <= numberLenght;
          iteratorNumber++
        ) {
          if (iteratorNumber < 5 || iteratorNumber > (numberLenght - 4)) {
            numberProtected += (
              account.public_identification_value[iteratorNumber]
            );
            continue;
          }

          numberProtected += 'X';
        }

        sendData.push({
          name: account.name,
          number: numberProtected,
          type: account.type,
          balance: `${account.currency} ${account.balance.current}`,
          credit_data: (account.credit_data || 'N/A'),
          last_accessed_at: account.last_accessed_at,
        })
      });
      res.json(sendData);
    })
    .catch(error => {
      res.status(500).send({
        message: error.message,
      });
    })
  );
});

router.post('/belvo/user/transactions', (req, res) => {
  const userData = jwt.decode(req.body.token);
  (
    client
    .connect()
    .then(() => client.transactions.retrieve(
      userData.link,
      '2021-01-01',
      {dateTo: '2021-07-01'}
    ))
    .then(transactions => {
      const sendData = [];
      transactions.map(transaction => {
        sendData.push({
          account: transaction.account.name,
          date: transaction.value_date,
          type: transaction.type,
          descriptor: transaction.description,
          balance: transaction.balance,
          status: transaction.status,
        })
      });
      res.json(sendData);
    })
    .catch(error => {
      res.status(500).send({
        message: error.message,
      });
    })
  );
});

router.post('/belvo/logout', (req, res) => {
  const userData = jwt.decode(req.body.token);
  (
    client
    .connect()
    .then(() => client.links.delete(userData.link))
    .then(status => {
      console.log(status);
      res.json({statusLink: status});
    })
    .catch(
      error => {
      res.status(500).send({
        message: error.message,
      });
    })
  );
});

app.listen(8081, () => {
  console.log('Servidor escuchando en el puerto', 8081);
});
