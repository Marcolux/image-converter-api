import app from "./app.js"
import sharp from "sharp"

sharp.concurrency(1) 
sharp.cache(false)

const PORT = process.env.PORT || 4000
app.listen(PORT, ()=>{

    console.log(`server is listening on port ${PORT}`)
})