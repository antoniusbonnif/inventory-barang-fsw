const bodyParser = require('body-parser')
const express = require('express');
const app = express();
const port = 3099;

app.use(express.urlencoded());
// app.use(bodyParser.urlencoded({extended: true}))


// database
const pg = require('pg');

const client = new pg.Client({
  user: 'jetdpxjg',
  host: 'kiouni.db.elephantsql.com',
  database: 'jetdpxjg',
  password: 'EAAPkIbaR79pz7WARyqC9uggWW22SEpS',
  port: 5432,
});

client.connect(function(error)
{
    if (error !==null) 
    {
        console.log("Cannot connect to the database", error);
    }
    else
    {
        console.log("Conected to Database");
    }
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.post('/api/barang', async(req, res) => {
  try {
    let payload = req.body;
    const { id_barang, nama_barang, jenis_barang, qty_barang, price, kondisi } = req.body;
    // insert to database
    const queryResult = await client.query(`
      INSERT INTO barang (nama_barang, jenis_barang, qty_barang, price, kondisi) VALUES ($1, $2, $3, $4, $5)`,
      [nama_barang, jenis_barang, qty_barang, price, kondisi]);

      // kasih response
    res.status(201).json({
        message: 'Success',
        data: queryResult.rows[0] // Sending back the inserted data
    });
      // res.status(201).send('success');
  } catch (error) 
  {
    console.error('Error executing query', error.stack);
    res.status(500).send('Error while inserting data');
  }
});

// tampilkan semua barang
app.get('/api/barang', async(req, res) => {
  // ambil data dari db
  const rawData = await client.query
  (`
      SELECT * FROM barang;
  `);
  const cleanData = rawData.rows;
  // kasih status
  res.status(200).json({data:[cleanData]});
});

// cari barang berdasarkan id
app.get('/api/barang/:id', async(req, res) => {
  // ambil data dari db
  // const id = parseInt(req.query.id, 10);
  const id = req.params.id;
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid ID format' });
  }
  try
  {
    // cari barang trus masukkan ke table temp
    const rawData = await client.query
    (`
        SELECT * FROM Barang WHERE id_barang = $1;
    `,[id]);

    // pindahin ke temp_keranjang
    await client.query(`
      INSERT INTO temp_keranjang (id_barang)
      SELECT id_barang FROM Barang WHERE id_barang = $1;
    `, [id]);
    
    const cleanData = rawData.rows;
    // kasih status
    res.status(200).json({data:cleanData});
  } catch(error)
  {
    await client.query('ROLLBACK');
    console.error('Error in transaction', error.stack);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// delete barang
app.delete('/api/barang/:id', async(req, res) =>{
  try {
    // Assuming you want to use a query parameter based on your existing code
    const id = parseInt(req.query.id, 10);
    if (isNaN(id)) {
      // If the id is not a number, return a 400 Bad Request
      return res.status(400).send('Invalid ID format');
    }

    // Perform the delete operation
    const queryResult = await client.query(
      `DELETE FROM Barang WHERE id_barang = $1`,
      [id]
    );

    console.log(queryResult.rowCount);

    // If the operation is successful, send back a success message
    if(queryResult.rowCount > 0){
      res.status(200).send(`Deleted ${queryResult.rowCount} row(s)`);
    } else {
      // If no rows were deleted, it could be that the item did not exist
      res.status(404).send('No rows deleted, item may not exist.');
    }
  } catch (error) {
    // If there is an error during the operation, catch it and return a 500 Internal Server Error
    console.error('Error during DELETE operation:', error);
    res.status(500).send('Error occurred during the delete operation');
  }
});

app.get('/api/barang-keluar/:id', async(req, res) => {
  const { id } = req.params;
  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO keluar (id_barang)
      SELECT id_barang FROM temp_keranjang WHERE id_barang = $1;
    `, [id]);

    await client.query('COMMIT');
    res.status(200).send('Sukses pindahkan dari temp_keranjang ke table keluar');
  } catch(error){
    console.error("Gagal memindahkan data : ", error);
    res.status(500).json({message: 'Internal server error'});
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});