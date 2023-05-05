const fs = require("fs");

(async () => {
  const output = fs.readdirSync("output");

  for (const fileName of output) {
    const arraybuffer = fs.readFileSync("output/" + fileName);
    const toBlob = new Blob([arraybuffer]);
    const fd = new FormData();
    fd.append("directory", "cms_dev/document-progress");
    fd.append("origin", "public_uploads");
    fd.append("file", toBlob, fileName);
    //"https://fm.prod.marketa.id/media-manager/upload"
    //"https://fm.superwa.io/media-manager/upload"
    const response = await fetch("https://fm.superwa.io/media-manager/upload", {
      method: "POST",
      body: fd,
    })
      .then((res) => res.json())
      .then(({ data }) => data);
    console.log(response.uploadRelativePath);
  }
})();
