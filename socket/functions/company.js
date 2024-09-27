
module.exports.getCompaniesWithEmptyArrays = async function({Company}) {
      const companies = await Company.find();
      let  companiesWithEmptyArrays = companies.reduce((acc,value)=>{
        const { _id } = value;
        acc.push(_id)
        return acc;
      },[]);
      console.log('companiesWithEmptyArrays',companiesWithEmptyArrays)
      return companiesWithEmptyArrays;
  }