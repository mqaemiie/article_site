const deleteProduct = btn => {
  const articleId = btn.parentNode.querySelector('[name=articleId]').value;
  const csrf = btn.parentNode.querySelector('[name=_csrf]').value;

  const productElement = btn.closest('article');

  fetch('/article-manager/' + articleId, {
    method: 'DELETE',
    headers: {
      'csrf-token': csrf
    }
  })
    .then(result => {
      return result.json();
    })
    .then(data => {
      console.log(data);
      productElement.parentNode.removeChild(productElement);
    })
    .catch(err => {
      console.log(err);
    });
};
