const express = require('express');
const cors = require('cors');
const app = express();
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const stripe = require("stripe")(process.env.CLIENT_SECRET_KEY)
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7u0ly7l.mongodb.net/?retryWrites=true&w=majority`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
const userCollection = client.db("SurveySync").collection("users");
const surveyCreationCollection = client.db("SurveySync").collection("surveyCreation");
// verify token

const verifyToken = (req, res, next) => {
    console.log('inside verify token', req.headers.authorization);
    if (!req.headers.authorization) {
      return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      req.decoded = decoded;
      next();
    })
  }

  const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await userCollection.findOne(query);
    const isAdmin = user?.role === 'admin';
    if (!isAdmin) {
      return res.status(403).send({ message: 'forbidden access' });
    }
    next();
  }
// jwt



app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
  res.send({ token });
})


app.post('/surveyCreation', verifyToken, async(req, res) => {
  const item = req.body;
  const result = await surveyCreationCollection.insertOne(item)
  res.send(result)
})

app.get('/surveyCreation',  verifyToken,  async(req, res) => {
  const result = await surveyCreationCollection.find().toArray()
  res.send(result)
})

//  app.patch('/surveyCreation/Unpublish/:id', verifyToken, verifyAdmin, async (req, res) => {
//     const id = req.params.id;
//     const filter = { _id: new ObjectId(id) };
//     const updatedDoc = {
//       $set: {
//         activity: 'unpublished'
//       }
//     }
//     const result = await surveyCreationCollection.updateOne(filter, updatedDoc);
//     res.send(result);
//   })
  app.get('/surveyCreation/:id', async(req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id)};
    const result = await surveyCreationCollection.findOne(query);
    res.send(result);
  })
  app.put('/surveyCreation/Unpublish/:id', verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) }
    const option = { upsert: true }
    const updatedProducts = req.body;
    const products = {
        $set: {
          activity: updatedProducts.activity,
          feedback: updatedProducts.feedback,
            
  
        }
    }
    const result = await surveyCreationCollection.updateOne(filter, products, option);
    res.send(result)
  })
 app.patch('/surveyCreation/publish/:id', verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        activity: 'published'
      }
    }
    const result = await surveyCreationCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })

app.get('/users/admin/:email', verifyToken, async (req, res) => {
  const email = req.params.email;

  if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' })
  }

  const query = { email: email };
  const user = await userCollection.findOne(query);
  let admin = false;
  if (user) {
    admin = user?.role === 'admin';
  }
  res.send({ admin });
})


app.post('/users', async(req, res) => {
   const user = req.body;
    const query = { email: user.email }
    const existingUser = await userCollection.findOne(query);
    if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
     }
    const result = await userCollection.insertOne(user);
    res.send(result);
  
 })

 app.patch('/users/admin/:id',  verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: 'admin'
      }
    }
    const result = await userCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })
 app.patch('/users/surveyor/:id',  verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: 'surveyor'
      }
    }
    const result = await userCollection.updateOne(filter, updatedDoc);
    res.send(result);
  }) 
 app.patch('/users/proUser/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: 'pro user',
        payment: 10
      }
    }
    const result = await userCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })

  app.delete('/users/:id', verifyAdmin, verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await userCollection.deleteOne(query);
    res.send(result);
  })

 app.get('/users',  verifyToken, verifyAdmin, async(req, res) => {
    const result = await userCollection.find().toArray()
    res.send(result)
 })
 app.get('/paring', verifyToken, async(req, res) => {
    const result = await userCollection.find().toArray()
    res.send(result)
 })


//  payment
app.post('/create-payment-intent', verifyToken, async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  console.log(amount, 'amount inside the intent')

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
  });

  res.send({
    clientSecret: paymentIntent.client_secret
  })
});


app.get("/", (req, res) => {
    res.send("Welcome to our  kre-survey")
})
app.listen(port, () => {
    console.log(`Welcome to kre survey ${port}` );
})









