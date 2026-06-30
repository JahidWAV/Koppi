export default async function handler(req, res) {
  console.log("Test: Fonction appelée avec succès");
  return res.status(200).json({ message: "La fonction répond !" });
}
