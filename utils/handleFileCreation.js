class HandleFileCreationHandler {
    constructor(){
        this.fileObject = {};
    }

    // Method to handle file creation
    handleFileCreation = async (file, File, user_id, uploadFile, session) => {
        const { originalname, mimetype } = file;
        const fileNameWithoutExtension = originalname.split('.').slice(0, -1).join('.');
        
        const fileExists = await File.find({
            originalname: {
                $regex: `^${fileNameWithoutExtension}`, 
                $options: 'i'
            } 
        });

        let newFileObject;

        try {
            if (fileExists && fileExists.length > 0) {
                // Get the last file in the file document that belongs to the user 
                const splitedOriginalname = fileExists[fileExists.length - 1].originalname.split('.');
                const editedOriginalName = this.generateFileName(splitedOriginalname);
                const url = await uploadFile(user_id, file, editedOriginalName);

                if (url) {
                    this.fileObject = {
                        originalname: editedOriginalName,
                        mimetype, 
                        url, 
                        user_id
                    };
                    const newFile = await File.create([this.fileObject], { session });
                    newFileObject = this.extractFileObject(newFile);
                }
            } else {
                const url = await uploadFile(user_id, file, originalname);
                if (url) {
                    this.fileObject = {
                        originalname, 
                        mimetype, 
                        url,
                        user_id,
                    };
                    const newFile = await File.create([this.fileObject], { session });
                    newFileObject = this.extractFileObject(newFile);
                }
            }
        } catch (error) {
            throw error;
        }

        return newFileObject;
    }

    // Method to extract the created file object
    extractFileObject = (file) => {
        // Ensure the file object is properly extracted
        return file[0];  // Use the first element since `create` returns an array
    }

    // Method to generate a new file name if similar files already exist
    generateFileName = (splitedOriginalname) => {
        let name, extension, editedOriginalName;
        
        if (splitedOriginalname && splitedOriginalname.length === 2) {
            let number = 1;
            name = splitedOriginalname[0];
            extension = splitedOriginalname[1];
            editedOriginalName = `${name}.${number}.${extension}`;
        } else if (splitedOriginalname && splitedOriginalname.length > 2) {
            name = splitedOriginalname[0];
            let currentNumberOfFilesWithSimilarName = splitedOriginalname[1];
            let updatedNumber = parseInt(currentNumberOfFilesWithSimilarName) + 1;
            extension = splitedOriginalname[2];
            editedOriginalName = `${name}.${updatedNumber}.${extension}`;
        }
    
        return editedOriginalName;
    }
}

module.exports = HandleFileCreationHandler;
