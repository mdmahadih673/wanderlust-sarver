import { MongoClient, ObjectId } from 'mongodb';
import express from 'express'
import 'dotenv/config'
import cors from 'cors'



const app = express()
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())


const client = new MongoClient(process.env.MONGODB_URL);

export async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("You successfully connected to MongoDB!");
        return client;
    } catch (err) {
        console.dir(err);
    }
}

const mongodbClirnt = await connectToMongoDB()

const db = mongodbClirnt.db("wanderlust")
const destinationCollection = db.collection("destination")
const bookingCollection = db.collection('bookings')


app.post('/add', async (req, res) => {
    const data = req.body
    const result = await destinationCollection.insertOne(data)

    res.send(result)
})

app.get('/destinations', async (req, res) => {
    const result = await destinationCollection.find().toArray()
    res.send(result)
})

app.get('/destinations/:id', async (req, res) => {
    const { id } = req.params
    const result = await destinationCollection.findOne({ _id: new ObjectId(id) })
    res.send(result)
})

app.patch('/destinations/:id', async (req, res) => {
    const { id } = req.params
    const data = { ...req.body }
    delete data._id

    const result = await destinationCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: data }
    )
    res.send(result)
})

app.delete('/destinations/:id', async (req, res) => {
    const { id } = req.params
    const result = await destinationCollection.deleteOne({ _id: new ObjectId(id) })
    res.send(result)
})

app.post('/booking', async (req, res) => {
    try {
        const data = { ...req.body }
        // _id belongs to the destination — let Mongo mint a fresh id per booking,
        // otherwise booking the same destination twice hits a duplicate-key error.
        data.destinationId = data._id
        delete data._id

        // One active booking per account per destination: a cancelled booking
        // doesn't count, so the destination becomes bookable again after a cancel.
        const existing = await bookingCollection.findOne({
            email: data.email,
            destinationId: data.destinationId,
            status: { $ne: 'Cancelled' },
        })
        if (existing) {
            return res.status(409).json({
                error: 'already_booked',
                message: 'You have already booked this destination.',
            })
        }

        data.status = 'Confirmed'
        const result = await bookingCollection.insertOne(data)
        res.send(result)
    } catch (err) {
        console.error('POST /booking failed:', err)
        res.status(500).json({ error: err.message })
    }
})


app.get('/my-booking/:email', async (req, res) => {
    const { email } = req.params
    const result = await bookingCollection.find({ email: email }).toArray()
    res.send(result)
})


app.delete('/my-bookings/:id', async (req, res) => {
    const { id } = req.params
    const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) })
    res.send(result)
})


app.get('/', (req, res) => {
    res.send('Hello World!')
})



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})