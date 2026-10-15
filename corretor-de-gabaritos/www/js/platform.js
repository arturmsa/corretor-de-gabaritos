/*
 * Corretor de Gabaritos
 * Criado pelo Prof. Artur, professor de Filosofia da
 * E.E. Monsenhor Joaquim Honório, Guamaré/RN.
 *
 * platform.js
 * Ponte entre o app e o celular: câmera, salvar arquivo e compartilhar
 * (WhatsApp aparece na lista de compartilhamento do Android).
 * Dentro do APK usa os plugins do Capacitor; no navegador usa recursos da web.
 */
(function (root) {
  'use strict';

  var Cap = root.Capacitor;
  var nativo = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  function plugin(nome) {
    if (!nativo) return null;
    return (Cap.Plugins && Cap.Plugins[nome]) || (Cap.registerPlugin ? Cap.registerPlugin(nome) : null);
  }

  function blobParaBase64(blob) {
    return new Promise(function (ok, erro) {
      var fr = new FileReader();
      fr.onload = function () { ok(String(fr.result).split(',')[1]); };
      fr.onerror = erro;
      fr.readAsDataURL(blob);
    });
  }

  // Tira foto (câmera) ou escolhe da galeria. Devolve um dataURL.
  function foto(inputEl) {
    var Camera = plugin('Camera');
    if (Camera) {
      return Camera.getPhoto({
        quality: 90, resultType: 'dataUrl', source: 'PROMPT', correctOrientation: true,
        width: 2400, allowEditing: false, saveToGallery: false,
        promptLabelHeader: 'Folha de respostas', promptLabelPhoto: 'Escolher da galeria',
        promptLabelPicture: 'Tirar foto', promptLabelCancel: 'Cancelar'
      }).then(function (r) { return r.dataUrl; });
    }
    return new Promise(function (ok, erro) {
      inputEl.value = '';
      inputEl.onchange = function () {
        var f = inputEl.files && inputEl.files[0];
        if (!f) return erro(new Error('cancelado'));
        var fr = new FileReader();
        fr.onload = function () { ok(fr.result); };
        fr.onerror = erro;
        fr.readAsDataURL(f);
      };
      inputEl.click();
    });
  }

  // Abre a tela de compartilhar do Android (WhatsApp, Drive, e-mail…)
  function compartilhar(blob, nomeArquivo, texto) {
    var Filesystem = plugin('Filesystem'), Share = plugin('Share');
    if (Filesystem && Share) {
      return blobParaBase64(blob).then(function (b64) {
        return Filesystem.writeFile({ path: nomeArquivo, data: b64, directory: 'CACHE' });
      }).then(function (w) {
        return Share.share({ title: nomeArquivo, text: texto || '', files: [w.uri], dialogTitle: 'Enviar por…' });
      });
    }
    var arquivo = new File([blob], nomeArquivo, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
      return navigator.share({ files: [arquivo], title: nomeArquivo, text: texto || '' });
    }
    baixarWeb(blob, nomeArquivo);
    return Promise.resolve('baixado');
  }

  // Salva o arquivo no celular (pasta Documentos) ou baixa no navegador
  function baixar(blob, nomeArquivo) {
    var Filesystem = plugin('Filesystem');
    if (Filesystem) {
      return blobParaBase64(blob).then(function (b64) {
        return Filesystem.writeFile({ path: 'Corretor de Gabaritos/' + nomeArquivo, data: b64, directory: 'DOCUMENTS', recursive: true });
      }).then(function () { return 'Salvo em Documentos › Corretor de Gabaritos'; });
    }
    baixarWeb(blob, nomeArquivo);
    return Promise.resolve('Arquivo baixado');
  }

  function baixarWeb(blob, nomeArquivo) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  root.GabPlatform = { nativo: nativo, foto: foto, compartilhar: compartilhar, baixar: baixar };
})(typeof self !== 'undefined' ? self : this);
