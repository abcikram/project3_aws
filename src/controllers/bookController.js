const bookModel = require("../models/booksModel")
const userModel = require("../models/userModel")
const reviewModel = require("../models/reviewModel")
const { isValidId, isValid, isValidIsbn,isValidrele } = require("../validator/validator")
const mongoose = require('mongoose')
const ObjectId = mongoose.Types.ObjectId

const aws= require("aws-sdk")
// s3 and cloud stodare
//  step1: multer will be used to get access to the file in nodejs( from previous session learnings)
//  step2:[BEST PRACTISE]:- always write s2 upload function separately- in a separate file/function..exptect it to take file as input and return the uploaded file as output
// step3: aws-sdk install - as package
// step4: Setupconfig for aws authenticcation- use code below as plugin keys that are given to you
//  step5: build the uploadFile funciton for uploading file- use code below and edit what is marked HERE only


//PROMISES:-
// -you can never use await on callback..if you awaited something , then you can be sure it is within a promise
// -how to write promise:- wrap your entire code inside: "return new Promise( function(resolve, reject) { "...and when error - return reject( err )..else when all ok and you have data, return resolve (data)

aws.config.update({
    accessKeyId: "AKIAY3L35MCRZNIRGT6N",
    secretAccessKey: "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",
    region: "ap-south-1"
})

let uploadFile= async ( file) =>{
   return new Promise( function(resolve, reject) {
    // this function will upload file to aws and return the link
    let s3= new aws.S3({apiVersion: '2006-03-01'}); // we will be using the s3 service of aws

    var uploadParams= {
        ACL: "public-read",
        Bucket: "classroom-training-bucket",  //HERE
        Key: "abc/" + file.originalname, //HERE 
        Body: file.buffer
    }

    s3.upload( uploadParams, function (err, data ){
        if(err) {
            return reject({"error": err})
        }
        console.log(data)
        console.log("file uploaded succesfully")
        return resolve(data.Location)
    })

    // let data= await s3.upload( uploadParams)
    // if( data) return data.Location
    // else return "there is an error"

   })
}
//________________________________________ Create Books _________________________________________________________//

const createBooks = async function (req, res) {
    try {
        //________________________________ request body using data _______________________________//
        data = req.body.data
        if(!data) return res.status(400).send({status: false, message: "Enter data"})
        let file = req.files
        let books = JSON.parse(data)
    
        //___________________________________ title validation ____________________________________//

        if (!isValid(books.title)) return res.status(400).send({ status: false, message: "Title is required ,title should be in string" })

        //____________________________ valiation for dublicate title or not ________________________// 

        let validtitle = await bookModel.findOne({ title: books.title })
        if (validtitle) return res.status(400).send({ status: false, message: "Title is already exists" })

        //______________________________ validation for excerpt ___________________________________//

        if (!isValid(books.excerpt)) return res.status(400).send({ status: false, message: "Excerpt is required ,excerpt should be in string" })

        //______________________________ validation for userId ___________________________________//

        if (!books.userId) return res.status(400).send({ status: false, message: "userId is required" })
        if(req.userId != books.userId) return res.status(403).send({status: false, message: "You are unauthorize person!!"})

        //_______________________________ check user regex _______________________________________//

        if (!isValidId(books.userId)) return res.status(400).send({ status: false, message: "enter valid user id" })

        //_______________________________ dublicate userId or not ________________________________//

        let checkuserId = await userModel.findById(books.userId)
        if (!checkuserId) return res.status(404).send({ status: false, message: "User is not found" })

        //________________________________ validation for ISBN _________________________________//
        if (!isValid(books.ISBN)) return res.status(400).send({ status: false, message: "ISBN is required ,ISBN should be in string" })
        if (!isValidIsbn(books.ISBN)) return res.status(400).send({ status: false, message: "ISBN is not valid" })
        let validISBN = await bookModel.findOne({ ISBN: books.ISBN })
        if (validISBN) return res.status(400).send({ status: false, message: "ISBN is already exists" })

        //____________________validation for catagory,subcatagory and releaseAt_________________//

        if (!isValid(books.category)) return res.status(400).send({ status: false, message: "category is required ,category should be in string" })

        if (!isValid(books.subcategory)) return res.status(400).send({ status: false, message: "Subcategory is required ,Subcategory should be in string" })

        if (!isValid(books.releasedAt)) return res.status(400).send({ status: false, message: "ReleasedAt should required, releaseAt should be in Date" })
        
        if(!isValidrele(books.releasedAt)) return res.status(400).send({ status:false , message:"releaseAt should be (yyyy-mm-dd) format and enter valid month , day and year"})

        let url = await uploadFile(file[0])
        books["bookCover"] = url
    
        let bookcreate = await bookModel.create(books)
        res.status(201).send({ status: true, message: "Success", data: bookcreate })

    } catch (err) {
        res.status(500).send({ status: false, message: "Server Error", error: err.message })
    }
}

//________________________________________ Get BooksByQuery _________________________________________________________//


const getBooksByQuery = async function (req, res) {
    try {
        let Query = req.query

        let getBook = await bookModel.find({ isDeleted: false })
            .select({ title: 1, excerpt: 1, userId: 1, category: 1, reviews: 1, releasedAt: 1 })
            .sort({ title: 1 })

        getBook.sort((a, b) => a.title.localeCompare(b.title))

        if (Object.keys(Query).length == 0) return res.status(200).send({ status: true, message: 'Book List', data: getBook })

        if (Query.userId == "") return res.status(400).send({ status: false, msg: "Please provide User Id" });

        if (Query.userId) {
            if (!ObjectId.isValid(Query.userId)) {
                return res.status(400).send({ status: false, msg: "User Id is invalid" });
            }
        }

        let getBooks = await bookModel.find({ $and: [Query, { isDeleted: false }] })
            .select({ title: 1, excerpt: 1, userId: 1, category: 1, reviews: 1, releasedAt: 1 })
            .sort({ title: 1 })

        getBooks.sort((a, b) => a.title.localeCompare(b.title))

        if (getBooks.length == 0) {
            return res.status(404).send({ status: false, message: "No book found" })
        }

        res.status(200).send({ status: true, message: "Book List", data: getBooks })
    }
    catch (err) {
        res.status(500).send({ status: false, message: "Server Error", error: err.message })
    }
}

//_________________________________________ Get Books by param _____________________________________________________//


const getBooksId = async function (req, res) {
    try {
        let bookId = req.params.bookId
        if (!isValidId(bookId)) {
            return res.status(400).send({ status: false, message: "Enter valid book Id" })
        }

        // finding bookdata by BookId 
        let books = await bookModel.findOne({ _id: bookId, isDeleted: false })
        if (!books) {
            return res.status(404).send({ status: false, message: "Book not found" })
        }

        // Returns a book with complete details including reviews
        const review = await reviewModel.find({ bookId: bookId, isDeleted: false }).select({ _id: 1, bookId: 1, reviewedBy: 1, reviewedAt: 1, rating: 1, review: 1 })
        let count = review.length
        if (!review) {
            return res.status(400).send({ status: false, message: "no review exists with this id" })
        }

        // merge reviewData key in book document
        books._doc["reviewsData"] = review

        // update counts of reviews 
        books._doc["reviews"] = count

        res.status(200).send({ status: true, message: 'Books list', data: books })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: "Server Error", error: err.message })
    }
}


//__________________________________________ Update Books _____________________________________________________//


const updateBooks = async function (req, res) {
    try {
        let bookId = req.params.bookId
        let bookdata = req.body

        //destructure of the req.body data :-
        let { title, excerpt, releasedAt, ISBN } = bookdata
        
        // req.body do not allow empty data :-
        if (Object.keys(bookdata).length == 0) 
        return res.status(400).send({ status: false, message: "please provide some data" })
        
        // finding the data from params bookId :-
        let checkbook = await bookModel.findOne({ _id: bookId, isDeleted: false })
        if (!checkbook) {
            return res.status(404).send({ status: false, message: "Books are not found or bookid is not valid" })
        }
        
        // In req.body checking Title name and ISBN number unique or not :- 
        let Title = await bookModel.findOne({ title: title, isDeleted: false })
        if (Title) return res.status(400).send({ status: false, message: "given title already exit" })
        let isbn = await bookModel.findOne({ ISBN: ISBN, isDeleted: false })
        if (isbn) return res.status(400).send({ status: false, message: "given isbn Number already exit" })
        
        // validate of req.body release date:-
        if(!isValidrele(releasedAt)) 
          return res.status(400).send({ status:false ,
          message:"releaseAt should be (yyyy-mm-dd) format and enter valid month , day and year"})
        
        // update the book :-
        let updatedata = await bookModel.findOneAndUpdate({ _id: bookId, isDeleted: false },
            { $set: { title: title, excerpt: excerpt, releasedAt: releasedAt, ISBN: ISBN } },
            { new: true })
        
        // In the reaponse we are send the updating book data :-
        return res.status(200).send({ status: true, message: "Success", data: updatedata })

    } catch (err) {
        res.status(500).send({ status: false, message: "Server Error", error: err.message })
    }
}


//__________________________________ delete by params _______________________________________________________//


const deleteBooksId = async function (req, res) {
    try {
        let bookId = req.params.bookId
        if (!isValidId(bookId)) {
            return res.status(400).send({ status: false, message: "Enter valid book id" })
        }

        let books = await bookModel.findOne({ _id: bookId, isDeleted: false })
        if (!books) {
            return res.status(404).send({ status: false, message: "Book not found" })
        }

        let deletebooks = await bookModel.findByIdAndUpdate(bookId
            , { isDeleted: true }
            , { new: true })

        res.status(200).send({ status: true, message: 'Books is deleted successfully' })

    }
    catch (err) {
        return res.status(500).send({ status: false, message: "Server Error", error: err.message })
    }
}



//___________________________________ Exports the module _________________________________________________//

module.exports = { createBooks, getBooksByQuery, getBooksId, deleteBooksId, updateBooks }

