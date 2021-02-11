// Imports the Google Cloud client library
const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore();

const makeDb = require("../database");
const { Storage } = require("@google-cloud/storage");

const db = makeDb();
const storage = new Storage({
  projectId: "document-validator",
  keyFilename: "document-validator-1e8cf051a5e8.json",
});


var sha256 = require('js-sha256');

const bucket = storage.bucket("document-validator");


const validationController = {
  async insert(req, res) {
    const { fileId, base64, motivation } = req.body;
    var file_hash = null;
    var contents = null;
    var or_hash = null;

    console.log(fileId);
    console.log(base64);
    console.log(motivation);
    console.log(req.body);

    // Gets hash from base64
    try{
        const file = Buffer.from(base64, "base64");
        file_hash = sha256(file);
    } catch (err) {
        console.log(err);
        res.status(500).send("Erro ao transformar arquivo em hash.");
    }

    // Gets file name and userid from database
    try{
        var userId = null;
        var name = null;
        const document = await db.query("SELECT userId, name FROM document WHERE documentId = ?", fileId);

        console.log(document);
        console.log(Object.keys(document).length);
        if (document && Object.keys(document).length > 0) {
            userId = document[0].userId;
            name = document[0].name;
        }
        else {
            res.status(200).send("Arquivo nao existe");
        }
        
    } catch (err) {
        console.log(err);
        res.status(500).send("Erro ao buscar informacoes do arquivo no banco de dados");
    }
    console.log(userId);
    console.log(name);
    

    // Gets file from google cloud storage and hash it
    try {
        var or_file = bucket.file(`${userId}/${name}`);
        or_hash = await or_file.download().then(function(data) {
            contents = data[0];
            return (sha256(contents));
        });
    } catch (err) {
        res.status(500).send("Erro ao buscar arquivo no storage");
    }

    try{
        const kind = "document-validator";
        const name = 'validation-id-' + Math.floor(Math.random() * (10000 - 1 + 1)) + 1;

        const taskKey = datastore.key([kind, name]);

        // Compare hashes
        if(or_hash === file_hash) {
            const task = {
                key: taskKey,
                data:{
                    fileId: fileId,
                    date: new Date(),
                    result: 'True',
                    motivation: motivation,
                }
            };
            await datastore.save(task);
            res.status(200).send("Arquivo e o mesmo!");
        }
        else {
            const task = {
                key: taskKey,
                data:{
                    fileId: fileId,
                    date: new Date(),
                    result: 'False',
                    motivation: motivation,
                }
            };
            await datastore.save(task);
            res.status(200).send("Arquivo nao e o mesmo!");
        }
    } catch(err) {
        console.log(err)
        res.status(500).send("Falha ao inserir validacao no datastore");
    }
  },
  async getValidationsByFileId(req, res){
    const { fileId} = req.params.fileId;

    console.log(fileId);

    const query = datastore.createQuery('document-validator').filter('fileId', '=', fileId);
    console.log(query);
    res.status(200).json(query);
  }
}

module.exports = validationController;