import fs from "fs";

const name = process.argv[2];

(async () => {
  const output = fs.readdirSync("output");

  const relativePaths = [];

  for (const fileName of output) {
    const arraybuffer = fs.readFileSync("output/" + fileName);
    const toBlob = new Blob([arraybuffer]);
    const fd = new FormData();
    fd.append("directory", "cms/document-progress/" + name);
    // fd.append("directory", "cms_dev/document-progress");
    fd.append("origin", "public_uploads");
    fd.append("file", toBlob, fileName);
    //"https://fm.prod.marketa.id/media-manager/upload"
    //"https://fm.superwa.io/media-manager/upload"
    const response = await fetch(
      "https://fm.prod.marketa.id/media-manager/upload",
      {
        method: "POST",
        body: fd,
      }
    )
      .then((res) => res.json())
      .then(({ data }) => data)
      .catch((err) => err);

    const { uploadRelativePath } = response || {};

    if (uploadRelativePath) relativePaths.push(uploadRelativePath);
    console.log(response?.uploadRelativePath || response);
  }

  if (!fs.existsSync("uploads.json")) fs.appendFileSync("uploads.json", "{}");
  fs.readFile("uploads.json", (err, data) => {
    const json = JSON.parse(data);
    json[name] = relativePaths;
    fs.writeFileSync("uploads.json", JSON.stringify(json, null, 2));
  });
})();
