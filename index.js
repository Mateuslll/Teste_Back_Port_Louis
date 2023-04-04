const fs = require('fs');

const pedidosDir = './pedidos';
const notasDir = './notas';

const pedidos = [];
const notas = [];

// ler todos os arquivos de pedidos
fs.readdirSync(pedidosDir).forEach(file => {
  const filePath = `${pedidosDir}/${file}`;
  const filename = file.split('.');
  const fileData = fs.readFileSync(filePath, 'utf8');
  const lines = fileData.split('\n');
  const pedido = [];
  for (const line of lines) {
    const item = JSON.parse(line.trim());
    const itemPedido = {...item, id: filename[0]};
    pedido.push(itemPedido);
    // adicionando os pedidos no array
  }  
  pedidos.push(pedido);
});

// ler todos os arquivos de notas
fs.readdirSync(notasDir).forEach(file => {
  const filePath = `${notasDir}/${file}`;
  const filename = file.split('.');
  const fileData = fs.readFileSync(filePath, 'utf8');
  const lines = fileData.split('\n');
  const nota = [];
  const produtos = []
  for (const line of lines) {
    const item = JSON.parse(line.trim()); //conversao do json para objeto
    const itemNota = {...item, id: filename[0]};
    nota.push(itemNota); //adionanco objeto pedidos
    // adicionando os notas 
  }  
  notas.push(nota);
});

const numeros = new Set();

// Validar os dados dos pedidos
for (const pedido of pedidos) {
  pedido.sort((a, b) => a.número_item - b.número_item);

  // Verificar se todos os números de item estão presentes
  //const maxNumItem2 = pedido.reduce((max, item) =>Math.max(max, item.numero_item),0);
  for (let i = 0; i < pedido.length; i++) {
    if (pedido[i].número_item !== i + 1) {
      throw new Error(`Falta o item ${i + 1} no pedido ${pedido.id}` );
    }
  }

  // verifica se tem items duplicados
  for (let i = 0; i < pedido.length; i++) {
    if (numeros.has(pedido[i].número_item)) {
      throw new Error(`O número de item ${pedido[i].número_item} está duplicado.`);
    } else {
      numeros.add(pedido[i].número_item);
    }
  }
  

  // Verificar se os tipos de dados estão corretos
  for (const item of pedido) {

    if (
      typeof item.número_item !== 'number' ||
      item.número_item <= 0 ||
      typeof item.código_produto !== 'string' ||
      typeof item.quantidade_produto !== 'number' ||
      item.quantidade_produto <= 0 ||
      typeof item.valor_unitário_produto !== 'number' ||
      item.valor_unitário_produto < 0
    ) {
      throw new Error(`Pedido ${item.id}, item ${item.número_item}: dados inválidos`);
    }
  }
}

// Validar dados das notas
for (const nota of notas) {
  // Verificar se os tipos de dados estão corretos
  for (const item of nota) {
    if (
      typeof item.id_pedido !== 'number' ||
      typeof item.número_item !== 'number' ||
      typeof item.quantidade_produto !== 'number'
    ) {
      throw new Error(`Nota ${item.id_pedido}, pedido ${item.id_pedido}: dados inválidos`);
    }
  }

  if(!checarItemsNoPedido(item.id_pedido, item.número_item)){
    throw new Error(`Nao existe o item ${item.número_item} no pedido ${item.id_pedido}`);
  }

}

// Identificar pedidos pendentes
const pedidosPendentes = [];

// Atualizar estado do pedido com as informações de cada nota
for (let i = 0; i < notas.length; i++) {
  const nota = notas[i];

  let item = null;

  for (const itemNota of nota) {
    
    for(const pedido of pedidos) {
      for(const itemPedido of pedido) {
        if(itemNota.número_item === itemPedido.número_item) {
          item = itemPedido;
        }
      }
    }

  }
  if (!item) {
    console.log(`Atenção: nota com número de item ${nota.número_item} não corresponde a um item do pedido.`);
  } else {
    let notaItem = nota.find((x) => x.número_item === item.número_item);
    item.quantidade_atendida = (item.quantidade_atendida || 0) + notaItem.quantidade_produto;

    if (item.quantidade_atendida > item.quantidade_produto) {
      throw new Error(`Atenção: quantidade atendida do item ${item.número_item} ultrapassou a quantidade solicitada.`);
    }
  }
}

// Verificar quais itens do pedido estão pendentes
for (let i = 0; i < pedido.length; i++) {
  const item = pedido[i];

  if (!item.quantidade_atendida || item.quantidade_atendida < item.quantidade_produto) {
    pedidosPendentes.push(pedido);
    break;
  }
}

const listagemPendencia = gerarListagemPedidosPendentes(pedidos);

fs.writeFile("./pendencias.txt", listagemPendencia, function(erro) {

  if(erro) {
      throw erro;
  }
}); 

const gerarListagemPedidosPendentes = (pedidos) => {
  let listagem = "";
  for (const pedido of pedidos) {
    let temPendencia = false;
    let valorTotalPedido = 0;
    let saldoValor = 0;
    let itensPendentes = "";
    for (const item of pedido) {
      let quantidadeTotalItem = item.quantidade_produto;
      let quantidadeAtendidaItem = 0;
      for (const nota of notas) {
        for (const itemNota of nota) {
          if (itemNota.número_item === item.número_item) {
            quantidadeAtendidaItem += itemNota.quantidade_produto;
          }
        }
      }
      let saldoQuantidade = quantidadeTotalItem - quantidadeAtendidaItem;
      if (saldoQuantidade > 0) {
        temPendencia = true;
        saldoValor += saldoQuantidade * item.valor_unitário_produto;
        itensPendentes += `${item.número_item} - saldo: ${saldoQuantidade}\n`;
      }
      valorTotalPedido += quantidadeTotalItem * item.valor_unitário_produto;
    }
    if (temPendencia) {
      listagem += `Pedido: ${pedido.número_pedido}\n`;
      listagem += `Valor total do pedido: R$ ${valorTotalPedido.toFixed(2)}\n`;
      listagem += `Saldo do valor: R$ ${saldoValor.toFixed(2)}\n`;
      listagem += `Itens pendentes:\n${itensPendentes}`;
    }
  }
  return listagem;
}

const checarItemsNoPedido = (id_pedido, numero_item) => {
  for (const pedido of pedidos) {
    for (const item of pedido) {
        if(item.id_pedido === id_pedido && item.número_item === numero_item ){
            return true;
        }
    }
  }
  return false;
}
