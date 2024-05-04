const express = require("express");
const cors = require("cors");
const{ connectToMongoDB, ObjectId } = require("./db");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.use(express.json());
app.use(cors());

function generateAcessToken (id, email)
{
    return jwt.sign({
        'user_id':id,
        'email' : email
    },process.env.TOKEN_SECRET ,{
        "expiresIn": "1d"
    })
}

function verifyToken(req,res,next)
{
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if(!token)
    {
        return res.status(400).json({
            error:"Missing Token"
        })
    }
    jwt.verify(token, process .env.TOKEN_SECRET, function(err,user){
        if(err)
        {
            return res.status(400).json({
                error:"invalid Token"
            })
        }
        req.user = user;
        next();
    })
}

async function main() {
    try{
        const db =  await connectToMongoDB();
        console.log("Connected to MongoDB Main");
    
        app.get("/" , function(req,res) {
         res.status(200).json("API Test")
        }) 

        app.post("/users", async function (req,res){
            const {email, password } = req.body;
            if(!email || !password)
            res.status(400).json({
                error : "Missingfields"
                
            })
            const respone = await db.collection('users').insertOne({
                email: email,
                password: await bcrypt.hash(password, 12)
            })
            res.status(201).json({
                respone
            });
        })

        app.post("/login", async function(req,res){
            const{email, password} = req.body;
            if(!email || !password)
            res.status(400).json({
                error : "Missingfields"

            })
            const user = await db.collection('users').findOne({
                email: email

            })
            if(user)
            {
                const validPassword = await bcrypt.compare(password, user.password);
                if(validPassword)
                {
                    const acessToken = generateAcessToken(user._id, user.email);
                    res.status(200).json({
                        acessToken
                    })
                }
                else 
                {
                    res.status(400).json({
                        error:"Invlid password"
                    })
                }
            }
            else{
                res.status(400).json({
                    error:"User not found"
                })
            }
        })

        app.post("/recipes",verifyToken, async function (req,res){
            const {name, cooking_duration,difficulty, cuisine, tags,ingredients } = req.body
            if(!name || !cooking_duration || !difficulty || !cuisine || !tags || !ingredients )
            {
                return res.status(400).json({"Message": "Missing Fields"})
            }
            const newRecipe = {
                name,
                cooking_duration,
                difficulty,
                cuisine,
                tags,
                ingredients

            }
            const respone = await db.collection('recipes').insertOne(newRecipe);
            res.status(201).json({respone});
        })

        app.get("/recipes",verifyToken, async function (req,res){
            try{
                const recipes = await db.collection('recipes').find({}).toArray();
                const tags = await db.collection('tags').find({}).toArray();
                const tagMap = {};

                for(let i=0;i< tags.length; i++)
                {
                    const tag = tags[i];
                    tagMap[tag._id] = tag.name;
                }

                for(const r of recipes)
                {
                    const cuisine =await db.collection('cuisine').findOne({
                        _id: r.cuisine
                    });
                    r.cuisine = cuisine.name;
                    if(Array.isArray(r.tags))
                    {
                        for(let k = 0; k< r.tags.length; k++)
                        {
                            const tagID = r.tags[k];
                            if(tagMap[tagID])
                            {
                                r.tags[k] = tagMap[tagID];
                            }
                        }
                    }
                }

               
                res.status(200).json(recipes);


            } catch (error){
                res.status(500).json({
                    "Message": "Error Reading Database"
                })

            }
        })
    
        app.get("/recipes/:recipes_id",verifyToken, async function(req,res){
            const{recipes_id} = req.params;
            const recipes = await db.collection('recipes').findOne({
                _id : new ObjectId(recipes_id)
            });
            const cuisine =await db.collection('cuisine').findOne({
                _id: recipes.cuisine
            });
            const tags = await db.collection('tags').find({}).toArray();
                const tagMap = {};

                for(let i=0;i< tags.length; i++)
                {
                    const tag = tags[i];
                    tagMap[tag._id] = tag.name;
                }
            recipes.cuisine = cuisine.name;
            if(Array.isArray(recipes.tags))
            {
                for(let k = 0; k< recipes.tags.length; k++)
                {
                    const tagID = recipes.tags[k];
                    if(tagMap[tagID])
                    {
                        recipes.tags[k] = tagMap[tagID];
                    }
                }
            }
            res.status(200).json(recipes);
        })
        app.delete("/recipes/:recipes_id",verifyToken, async function(req,res){
            const{recipes_id} = req.params;
            const respone = await db.collection('recipes').deleteOne({
                _id : new ObjectId(recipes_id)
            })
            res.status(200).json({respone});
        })

        app.put("/recipes/:recipes_id",verifyToken, async function (req,res){
            const {recipes_id} = req.params;
            const {name, cooking_duration,difficulty, cuisine, tags,ingredients } = req.body
            if(!name || !cooking_duration || !difficulty || !cuisine || !tags || !ingredients )
            {
                return res.status(400).json({"Message": "Missing Fields"})
            }
            const respone = await db.collection('recipes').updateOne({
                _id: new ObjectId (recipes_id)
            },{
                '$set':{
                    name: name,
                    cooking_duration: cooking_duration,
                    difficulty : difficulty,
                    cuisine : cuisine,
                    tags : tags,
                    ingredients : ingredients
                }
            })
            res.send(200).json({respone});
           })
    }


    catch (error) { 
        console.log("Error connecting to MongoDB")
    }
}

main();

const port = 7878;
app.listen(port, function() {
    console.log("Server is Running on port" + port);

})